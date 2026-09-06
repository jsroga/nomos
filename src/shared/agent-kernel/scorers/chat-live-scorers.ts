import type { MastraScorers } from '@mastra/core/evals'
import { goalReachedScorer } from './goal-reached-scorer'
import { hallucinationScorer } from './hallucination-scorer'
import { magicScorer } from './magic-scorer'
import { proseCraftScorer } from './prose-craft-scorer'

export enum ChatLiveScorerSamplingType {
  Ratio = 'ratio',
}

/** Eval-phase sample rate for goal-reached — not attached to HTTP chat. */
export const CHAT_LIVE_GOAL_SAMPLE_RATE = 1

/** Sampled LLM quality judges (0.1–0.3 band). */
export const CHAT_LIVE_QUALITY_SAMPLE_RATE = 0.2

const always = {
  type: ChatLiveScorerSamplingType.Ratio,
  rate: CHAT_LIVE_GOAL_SAMPLE_RATE,
} as const

const sampled = {
  type: ChatLiveScorerSamplingType.Ratio,
  rate: CHAT_LIVE_QUALITY_SAMPLE_RATE,
} as const

/**
 * HTTP chat / e2e smoke attach this. Live LLM judges (`JUDGING_MODEL`,
 * default GPT-5.6 Sol) belong on `npm run eval` and Studio Trace Evaluate,
 * not on every Writers Room turn.
 */
export const CHAT_HTTP_SCORERS = {} as const

/**
 * Sampling table for Studio Trace Evaluate / evals — not attached to HTTP chat.
 * `goal-reached` every sampled eval turn; quality judges on a sample of turns.
 */
export const CHAT_LIVE_SCORERS = {
  goalReached: { scorer: goalReachedScorer, sampling: always },
  hallucination: { scorer: hallucinationScorer, sampling: sampled },
  magic: { scorer: magicScorer, sampling: sampled },
  proseCraft: { scorer: proseCraftScorer, sampling: sampled },
} satisfies MastraScorers
