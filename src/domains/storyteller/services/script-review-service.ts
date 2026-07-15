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
} from '@/domains/storyteller/ai/agents/critics'
import { generateCriticReport } from '@/domains/storyteller/ai/agents/critics/run-critic'
import type { CriticReport } from '@/domains/storyteller/ai/agents/critics'
import { ConsistencySeverity } from '@/domains/storyteller/services/constants/consistency-issues'
import {
  ReviewPersonaKey,
  ScriptReviewCopy,
  ScriptReviewContextLabel,
  ScriptReviewContextSeparator,
} from '@/domains/storyteller/services/constants/script-review'

export type ReviewPersona =
  | ReviewPersonaKey.GeorgeRrMartin
  | ReviewPersonaKey.VinceGilligan
  | ReviewPersonaKey.DavidLynch

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
  [ReviewPersonaKey.GeorgeRrMartin]: proseCritic,
  [ReviewPersonaKey.VinceGilligan]: continuityCritic,
  [ReviewPersonaKey.DavidLynch]: stakesCritic,
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
      .filter(f => f.severity !== ConsistencySeverity.Critical)
      .map(f => `[${f.severity}] ${f.why}`),
    score: scoreFromReport(report),
    quote: report.findings[0]?.quote ?? ScriptReviewCopy.NoFindings,
  }
}

function buildContextBlock(request: ScriptReviewRequest): string {
  const premise = request.episodePremise
    ? `${ScriptReviewContextLabel.EpisodePremise}${ScriptReviewContextSeparator.Line}${JSON.stringify(request.episodePremise, null, 2)}`
    : ''
  const characters = request.characters?.length
    ? `${ScriptReviewContextLabel.Characters}${ScriptReviewContextSeparator.Line}${request.characters
        .map(c => `- ${c.name}${c.role ? ` (${c.role})` : ''}`)
        .join(ScriptReviewContextSeparator.Line)}`
    : ''
  return [premise, characters].filter(Boolean).join(ScriptReviewContextSeparator.Block)
}

/** Single-critic review — replaces the judge's `quickReview`. */
export async function quickReview(script: string, persona: ReviewPersona): Promise<PersonaReview> {
  const critic = PERSONA_TO_CRITIC[persona]
  const report = await generateCriticReport(
    critic,
    `${ScriptReviewContextLabel.DraftScript}${ScriptReviewContextSeparator.Line}${script}`
  )
  return toPersonaReview(persona, report)
}

/** Full three-critic review — replaces the judge's `reviewScript`. */
export async function reviewScript(request: ScriptReviewRequest): Promise<ScriptReviewResult> {
  const context = buildContextBlock(request)
  const draftBlock = `${ScriptReviewContextLabel.DraftScript}${ScriptReviewContextSeparator.Line}${request.script}`
  const withContext = context
    ? `${context}${ScriptReviewContextSeparator.Block}${draftBlock}`
    : draftBlock

  const [prose, continuity, stakes] = await Promise.all([
    generateCriticReport(proseCritic, draftBlock),
    generateCriticReport(continuityCritic, withContext),
    generateCriticReport(stakesCritic, withContext),
  ])

  const reviews: PersonaReview[] = [
    toPersonaReview(ReviewPersonaKey.GeorgeRrMartin, prose),
    toPersonaReview(ReviewPersonaKey.VinceGilligan, continuity),
    toPersonaReview(ReviewPersonaKey.DavidLynch, stakes),
  ]

  const allFindings = [...prose.findings, ...continuity.findings, ...stakes.findings]
  const overallScore = clampScore(
    reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
  )

  const criticalFindings: typeof allFindings = []
  const otherFindings: typeof allFindings = []
  for (const f of allFindings) {
    if (f.severity === ConsistencySeverity.Critical) criticalFindings.push(f)
    else otherFindings.push(f)
  }

  return {
    overallScore,
    overallFeedback:
      allFindings.length === 0
        ? ScriptReviewCopy.AllCriticsClear
        : `${allFindings.length} finding(s) across three critics — most severe first in each review.`,
    reviews,
    synthesis: {
      mustFix: criticalFindings.map(f => `"${f.quote}" — ${f.why}`),
      suggestions: otherFindings.map(f => `[${f.severity}] ${f.why}`),
      // Critics don't praise; standout detection was judge-era behavior.
      standoutMoments: [],
    },
  }
}
