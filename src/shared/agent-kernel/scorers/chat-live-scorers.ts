import type { MastraScorers } from '@mastra/core/evals'
import { goalReachedScorer } from './goal-reached-scorer'
import { hallucinationScorer } from './hallucination-scorer'
import { magicScorer } from './magic-scorer'
import { proseCraftScorer } from './prose-craft-scorer'

export enum ChatLiveScorerSamplingType {
  Ratio = 'ratio',
}

/** Always-on for the conversation-goal judge already on the chat adapter. */
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
 * Live Studio / trace scores for the chat adapter.
 * `goal-reached` every turn; quality judges on a sample of turns.
 */
export const CHAT_LIVE_SCORERS = {
  goalReached: { scorer: goalReachedScorer, sampling: always },
  hallucination: { scorer: hallucinationScorer, sampling: sampled },
  magic: { scorer: magicScorer, sampling: sampled },
  proseCraft: { scorer: proseCraftScorer, sampling: sampled },
} satisfies MastraScorers
