/**
 * Script review backed by the three narrow critics (continuity, prose,
 * stakes) — replaces the deleted persona judge (`agents/judges/
 * ScriptReviewAgent`) behind the SAME API shapes.
 *
 * Critics diagnose with quoted evidence and never rewrite, so:
 * - `strengths` is always empty (critics don't praise by design),
 * - `suggestions` carry diagnosis text, never replacement prose,
 * - scores derive from severity counts, not LLM vibes.
 *
 * The legacy persona labels are kept for response-shape compatibility and
 * map to the closest critic brief: george-rr-martin ← prose craft,
 * vince-gilligan ← continuity/rigorous logic, david-lynch ← stakes/tension.
 */

import 'server-only'
import type { Agent } from '@mastra/core/agent'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
} from '@/domains/storyteller/agents/critics'
import { generateCriticReport } from '@/domains/storyteller/agents/critics/run-critic'
import type { CriticReport } from '@/domains/storyteller/agents/critics'

export type ReviewPersona = 'george-rr-martin' | 'vince-gilligan' | 'david-lynch'

export interface ScriptReviewRequest {
  script: string
  episodePremise?: {
    title?: string
    logline?: string
    protagonistHook?: string
    fatalFlaw?: string
    stakes?: string
  }
  characters?: Array<{
    name: string
    role?: string
    traits?: string[]
  }>
  focusAreas?: ('dialogue' | 'action' | 'structure' | 'character' | 'atmosphere')[]
}

export interface PersonaReview {
  persona: ReviewPersona
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  score: number // 1-10
  quote: string // First quoted finding (or the all-clear line)
}

export interface ScriptReviewResult {
  overallScore: number
  overallFeedback: string
  reviews: PersonaReview[]
  synthesis: {
    mustFix: string[]
    suggestions: string[]
    standoutMoments: string[]
  }
}

const PERSONA_TO_CRITIC: Record<ReviewPersona, Agent> = {
  'george-rr-martin': proseCritic,
  'vince-gilligan': continuityCritic,
  'david-lynch': stakesCritic,
}

const SEVERITY_PENALTY: Record<CriticReport['findings'][number]['severity'], number> = {
  critical: 3,
  major: 1.5,
  minor: 0.5,
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10))
}

function scoreFromReport(report: CriticReport): number {
  const penalty = report.findings.reduce((sum, f) => sum + SEVERITY_PENALTY[f.severity], 0)
  return clampScore(10 - penalty)
}

function toPersonaReview(persona: ReviewPersona, report: CriticReport): PersonaReview {
  return {
    persona,
    // Critics diagnose only — no praise, no replacement prose.
    strengths: [],
    weaknesses: report.findings.map(f => `"${f.quote}" — ${f.why}`),
    suggestions: report.findings
      .filter(f => f.severity !== 'critical')
      .map(f => `[${f.severity}] ${f.why}`),
    score: scoreFromReport(report),
    quote: report.findings[0]?.quote ?? 'NO FINDINGS.',
  }
}

function buildContextBlock(request: ScriptReviewRequest): string {
  const premise = request.episodePremise
    ? `EPISODE PREMISE:\n${JSON.stringify(request.episodePremise, null, 2)}`
    : ''
  const characters = request.characters?.length
    ? `CHARACTERS:\n${request.characters
        .map(c => `- ${c.name}${c.role ? ` (${c.role})` : ''}`)
        .join('\n')}`
    : ''
  return [premise, characters].filter(Boolean).join('\n\n')
}

/** Single-critic review — replaces the judge's `quickReview`. */
export async function quickReview(script: string, persona: ReviewPersona): Promise<PersonaReview> {
  const critic = PERSONA_TO_CRITIC[persona]
  const report = await generateCriticReport(critic, `DRAFT SCRIPT:\n${script}`)
  return toPersonaReview(persona, report)
}

/** Full three-critic review — replaces the judge's `reviewScript`. */
export async function reviewScript(request: ScriptReviewRequest): Promise<ScriptReviewResult> {
  const context = buildContextBlock(request)
  const draftBlock = `DRAFT SCRIPT:\n${request.script}`
  const withContext = context ? `${context}\n\n${draftBlock}` : draftBlock

  const [prose, continuity, stakes] = await Promise.all([
    generateCriticReport(proseCritic, draftBlock),
    generateCriticReport(continuityCritic, withContext),
    generateCriticReport(stakesCritic, withContext),
  ])

  const reviews: PersonaReview[] = [
    toPersonaReview('george-rr-martin', prose),
    toPersonaReview('vince-gilligan', continuity),
    toPersonaReview('david-lynch', stakes),
  ]

  const allFindings = [...prose.findings, ...continuity.findings, ...stakes.findings]
  const overallScore = clampScore(
    reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
  )

  return {
    overallScore,
    overallFeedback:
      allFindings.length === 0
        ? 'All three critics returned no findings.'
        : `${allFindings.length} finding(s) across three critics — most severe first in each review.`,
    reviews,
    synthesis: {
      mustFix: allFindings
        .filter(f => f.severity === 'critical')
        .map(f => `"${f.quote}" — ${f.why}`),
      suggestions: allFindings
        .filter(f => f.severity !== 'critical')
        .map(f => `[${f.severity}] ${f.why}`),
      // Critics don't praise; standout detection was judge-era behavior.
      standoutMoments: [],
    },
  }
}
