/**
 * PLAN-V2 5.6 — wildcards A/B gate.
 *
 * Runs a set of briefs through the beat-draft pipeline twice — sparks OFF vs
 * sparks ON (`wildcards`) — scores both drafts on the motion-sensitive scorers,
 * and recommends flipping the `wildcards` default ON only when story-motion
 * improves and no gate scorer regresses.
 *
 * Requires keys + a scratch project/episode (so it is a no-op until they exist):
 *   DATABASE_URL, an LLM key (OPENROUTER_API_KEY; JUDGING_MODEL optional),
 *   WILDCARDS_AB_PROJECT_ID, WILDCARDS_AB_EPISODE_ID.
 *
 * Usage: npx tsx evals/experiments/wildcards-ab.ts
 *
 * Follow-up (needs the rag embeddings API): add novelty = embedding distance of
 * each draft vs the project's existing beats, per 5.6.
 */

import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { Mastra } from '@mastra/core/mastra'
import {
  createBeatDraftWorkflow,
  defaultBeatDraftDeps,
} from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
import { beatDraftOutputSchema } from '@/domains/storyteller/ai/workflows/beat-draft-contract'

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined)
}

// The scorers whose deltas decide the flip. story-motion is the king criterion.
const GATE_SCORER_IDS = ['story-motion', 'magic', 'stakes-cost'] as const
type GateScorerId = (typeof GATE_SCORER_IDS)[number]

// Briefs exercised in both arms. Each must force a concrete beat, not a mood.
const AB_BRIEFS: readonly string[] = [
  'The lieutenant must decide whether to burn the bridge with her own platoon still on the far bank.',
  'A healer discovers the plague ward has been sealed from the outside; the beat must change who holds power.',
  'Two partners split the last dose of the antidote; by the end one of them can never trust the other again.',
]

interface ArmScores {
  byScorer: Record<GateScorerId, number[]>
}

function emptyArm(): ArmScores {
  return { byScorer: { 'story-motion': [], magic: [], 'stakes-cost': [] } }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function hasLlmKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY || process.env.JUDGING_MODEL || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
}

async function runArm(
  brief: string,
  wildcards: boolean,
  projectId: string,
  episodeId: string
): Promise<string | null> {
  const workflow = createBeatDraftWorkflow(defaultBeatDraftDeps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  const run = await workflow.createRun()
  const result = await run.start({
    inputData: { projectId, episodeId, brief, characters: [], autoApprove: true, wildcards },
  })
  if (result.status !== 'success') return null
  return beatDraftOutputSchema.parse(result.result).finalDraft
}

async function scoreDraft(brief: string, draft: string, arm: ArmScores): Promise<void> {
  const { ALL_SCORERS } = await import('@/shared/agent-kernel/scorers')
  for (const scorer of ALL_SCORERS) {
    if (!GATE_SCORER_IDS.some(id => id === scorer.id)) continue
    const scorerId = GATE_SCORER_IDS.find(id => id === scorer.id)
    if (!scorerId) continue
    try {
      const result = await scorer.run({ input: { message: brief }, output: draft })
      arm.byScorer[scorerId].push(result.score)
    } catch (error) {
      console.warn(`   scorer ${scorer.id} failed:`, error)
    }
  }
}

function reportAndRecommend(off: ArmScores, on: ArmScores): void {
  console.log('\n=== wildcards A/B — mean scores (OFF → ON) ===')
  let storyMotionImproved = false
  let anyRegression = false
  for (const id of GATE_SCORER_IDS) {
    const offMean = mean(off.byScorer[id])
    const onMean = mean(on.byScorer[id])
    const delta = onMean - offMean
    console.log(`${id.padEnd(14)} ${offMean.toFixed(3)} → ${onMean.toFixed(3)}  (${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`)
    if (id === 'story-motion' && delta > 0) storyMotionImproved = true
    if (delta < -0.01) anyRegression = true
  }
  const flip = storyMotionImproved && !anyRegression
  console.log(`\nRecommendation: ${flip ? 'FLIP wildcards default → ON' : 'KEEP wildcards default OFF'}`)
  console.log('(flip only when story-motion improves and no gate scorer regresses)')
}

async function main(): Promise<void> {
  loadEnv()
  const projectId = process.env.WILDCARDS_AB_PROJECT_ID
  const episodeId = process.env.WILDCARDS_AB_EPISODE_ID
  if (!process.env.DATABASE_URL || !hasLlmKey() || !projectId || !episodeId) {
    console.log(
      'wildcards-ab: skipped — needs DATABASE_URL, an LLM key, WILDCARDS_AB_PROJECT_ID, and WILDCARDS_AB_EPISODE_ID.'
    )
    return
  }

  const off = emptyArm()
  const on = emptyArm()
  for (const brief of AB_BRIEFS) {
    console.log(`\n> brief: ${brief}`)
    const offDraft = await runArm(brief, false, projectId, episodeId)
    const onDraft = await runArm(brief, true, projectId, episodeId)
    if (offDraft) await scoreDraft(brief, offDraft, off)
    if (onDraft) await scoreDraft(brief, onDraft, on)
  }
  reportAndRecommend(off, on)
}

void main()
