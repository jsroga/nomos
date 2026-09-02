import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import '@/shared/data/server-guard'
import type { WildIdea } from './wild-idea-schema'
import {
  IDEA_VERDICT,
  RankReportSchema,
  ideaTotalScore,
  type RankedIdea,
} from './ranked-idea-schema'
import { museRankerAgent } from '../../../../../mastra/agents/muse-ranker/agent'

/** FS agent package is the SSOT — @see src/mastra/agents/muse-ranker/ */
export { museRankerAgent }

const BLOCK_SEPARATOR = '\n\n'
const SPARKS_CONTRACT_HEADER =
  'WILD SPARKS (ranked, optional): for EACH spark, either weave it into the plan or reject it BY NUMBER with one line of reasoning in your head — never silently ignore. Sparks are provocations, not orders; the brief always wins.'

/**
 * Rank stage (PLAN-V2 5.3) — the picky judge the brainstorm deliberately
 * lacks. Runs WITH bible context (unlike the blank-context Muse): scores each
 * surviving wild idea on surprise / story motion / fit / cost, keeps the top
 * few with reasons, rejects the rest with reasons.
 */

export interface RankInput {
  ideas: WildIdea[]
  /** Canon block (bible + existing beats) — the context the Muse never saw. */
  canon: string
  /** What the current beat must accomplish. */
  brief: string
  /** Maximum ideas to keep (default 3). */
  keepMax?: number
}

export interface RankResult {
  /** Kept ideas, best first (weighted total, storyMotion-heavy). */
  kept: RankedIdea[]
  /** Rejected ideas with the judge's reasons (telemetry + suspend payload). */
  rejected: RankedIdea[]
}

/** Model call seam — injectable for mechanics tests. */
export type RankGenerate = (prompt: string) => Promise<unknown>

const DEFAULT_KEEP_MAX = 3

function buildRankPrompt(input: RankInput): string {
  const ideasBlock = input.ideas
    .map(
      (idea, index) =>
        `IDEA ${index + 1}:\n- hook: ${idea.hook}\n- mechanism: ${idea.mechanism}\n- collision: ${idea.collision}`
    )
    .join(BLOCK_SEPARATOR)

  return `CANON (the ideas were generated WITHOUT this — judge fit against it):
${input.canon}

BRIEF (what the next beat must accomplish):
${input.brief}

${ideasBlock}

Score EVERY idea (surprise, storyMotion, fit, cost — 0-10 each), give a keep/reject verdict and a one-sentence reason. Output JSON.`
}

const defaultRankGenerate: RankGenerate = async prompt => {
  const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () => museRankerAgent.generate(prompt, {
    structuredOutput: { schema: RankReportSchema },
  }))
  return response.object
}

export async function rankWildIdeas(
  input: RankInput,
  generate: RankGenerate = defaultRankGenerate
): Promise<RankResult> {
  if (input.ideas.length === 0) return { kept: [], rejected: [] }

  const raw = await generate(buildRankPrompt(input))
  const parsed = RankReportSchema.safeParse(raw)
  // A flaky ranker keeps nothing — the pipeline proceeds sparkless, never fails.
  if (!parsed.success) return { kept: [], rejected: [] }

  const keepMax = input.keepMax ?? DEFAULT_KEEP_MAX
  const ordered = [...parsed.data.ranked].sort(
    (a, b) => ideaTotalScore(b.scores) - ideaTotalScore(a.scores)
  )
  const kept: typeof ordered = []
  const rejected: typeof ordered = []
  for (const entry of ordered) {
    if (entry.verdict === IDEA_VERDICT.keep && kept.length < keepMax) kept.push(entry)
    else rejected.push(entry)
  }
  return { kept, rejected }
}

/** Render kept sparks for the beat-planner prompt (engage-or-reject contract). */
export function formatSparksForPlanner(kept: RankedIdea[]): string {
  if (kept.length === 0) return ''
  const sparkLines = kept
    .map(
      (entry, index) =>
        `SPARK ${index + 1} (${entry.reason}):\n- ${entry.idea.hook}\n- mechanism: ${entry.idea.mechanism}`
    )
    .join(BLOCK_SEPARATOR)
  return `
${SPARKS_CONTRACT_HEADER}

${sparkLines}`
}
