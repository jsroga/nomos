import { consistencyScorer } from './consistency-scorer'
import { goalReachedScorer } from './goal-reached-scorer'
import { hallucinationScorer } from './hallucination-scorer'
import { ideaUniquenessScorer } from './idea-uniqueness-scorer-wire'
import { ideaDiversityJudgeScorer } from './idea-diversity-judge-scorer'
import { magicScorer } from './magic-scorer'
import { personaFidelityScorer } from './persona-fidelity-scorer'
import { proseCraftScorer } from './prose-craft-scorer'
import { stakesCostScorer } from './stakes-cost-scorer'
import { storyMotionScorer } from './story-motion-scorer'

/** Mastra scorers — single definition for batch evals (`npm run eval`) and Mastra registry. */
export const ALL_SCORERS = [
  magicScorer,
  consistencyScorer,
  hallucinationScorer,
  personaFidelityScorer,
  proseCraftScorer,
  stakesCostScorer,
  storyMotionScorer,
] as const

/**
 * Idea-set scorers for the `idea-diversity` dataset (`npm run eval -- --dataset=idea-diversity`).
 * Deterministic uniqueness (keys-free) + LLM judge (needs `JUDGING_MODEL`), both
 * standard Mastra scorers run through `scorer.run()` by `evals/run.ts`.
 */
export const IDEA_DIVERSITY_SCORERS = [ideaUniquenessScorer, ideaDiversityJudgeScorer] as const

export type EvalScorerId = (typeof ALL_SCORERS)[number]['id']

export type EvalScorer = (typeof ALL_SCORERS)[number]

export const STORYTELLER_SCORERS = {
  magic: magicScorer,
  consistency: consistencyScorer,
  hallucination: hallucinationScorer,
  'persona-fidelity': personaFidelityScorer,
  'prose-craft': proseCraftScorer,
  'stakes-cost': stakesCostScorer,
  'story-motion': storyMotionScorer,
  'goal-reached': goalReachedScorer,
} as const

export {
  magicScorer,
  consistencyScorer,
  goalReachedScorer,
  hallucinationScorer,
  ideaUniquenessScorer,
  ideaDiversityJudgeScorer,
  personaFidelityScorer,
  proseCraftScorer,
  stakesCostScorer,
  storyMotionScorer,
}
export { scoreIdeaDiversity } from './idea-diversity-metrics-wire'
export type { IdeaDiversityMetrics } from './idea-diversity-metrics-wire'
export { extractProse, inputRecord, normalizeScore, outputToString, toMastraJudgingModel } from './shared'
