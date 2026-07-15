import '@/shared/data/server-guard'
import { Agent } from '@mastra/core/agent'
import { resolveRoleModel } from '@/domains/storyteller/config/constants/model-config'
import type { WildIdea } from './wild-idea-schema'
import {
  IDEA_VERDICT,
  RankReportSchema,
  ideaTotalScore,
  type RankedIdea,
} from './ranked-idea-schema'

const BLOCK_SEPARATOR = '\n\n'
const SPARKS_CONTRACT_HEADER =
  'WILD SPARKS (ranked, optional): for EACH spark, either weave it into the plan or reject it BY NUMBER with one line of reasoning in your head — never silently ignore. Sparks are provocations, not orders; the brief always wins.'

/**
 * Rank stage (PLAN-V2 5.3) — the picky judge the brainstorm deliberately
 * lacks. Runs WITH bible context (unlike the blank-context Muse): scores each
 * surviving wild idea on surprise / story motion / fit / cost, keeps the top
 * few with reasons, rejects the rest with reasons. Planner-class model —
 * this is a high-importance structural decision (user model policy).
 */

const RANKER_ID = 'muse-ranker'
const RANKER_NAME = 'Muse Ranker'
const RANKER_ROLE: Parameters<typeof resolveRoleModel>[0] = 'planner'
const RANKER_DESCRIPTION =
  'Scores wild ideas against canon: surprise, story motion, fit, cost. Keeps the few that make the story lurch forward.'

const RANKER_INSTRUCTIONS = `You judge story ideas coldly, with evidence.

Scoring discipline:
- storyMotion is the king criterion: does the idea force an IRREVERSIBLE state change that named characters must respond to? Mood scores 0.
- surprise measures non-obviousness relative to the brief — not weirdness for its own sake.
- fit is judged against the canon you are given: an idea that contradicts established facts scores low UNLESS the contradiction is the point and playable.
- cost: someone pays a real price. Free victories score 0.
- Reject generously. Keeping a mediocre idea costs more than losing a good one — the pipeline runs again next beat.`

export const museRankerAgent = new Agent({
  id: RANKER_ID,
  name: RANKER_NAME,
  description: RANKER_DESCRIPTION,
  instructions: RANKER_INSTRUCTIONS,
  model: () => resolveRoleModel(RANKER_ROLE),
})

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
  const response = await museRankerAgent.generate(prompt, {
    structuredOutput: { schema: RankReportSchema },
  })
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
