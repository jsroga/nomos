import { consistencyScorer } from './consistency-scorer'
import { hallucinationScorer } from './hallucination-scorer'
import { magicScorer } from './magic-scorer'
import { personaFidelityScorer } from './persona-fidelity-scorer'
import { proseCraftScorer } from './prose-craft-scorer'
import { stakesCostScorer } from './stakes-cost-scorer'

/** Mastra scorers — single definition for batch evals (`npm run eval`) and Mastra registry. */
export const ALL_SCORERS = [
  magicScorer,
  consistencyScorer,
  hallucinationScorer,
  personaFidelityScorer,
  proseCraftScorer,
  stakesCostScorer,
] as const

export type EvalScorerId = (typeof ALL_SCORERS)[number]['id']

export type EvalScorer = (typeof ALL_SCORERS)[number]

export const STORYTELLER_SCORERS = {
  magic: magicScorer,
  consistency: consistencyScorer,
  hallucination: hallucinationScorer,
  'persona-fidelity': personaFidelityScorer,
  'prose-craft': proseCraftScorer,
  'stakes-cost': stakesCostScorer,
} as const

export {
  magicScorer,
  consistencyScorer,
  hallucinationScorer,
  personaFidelityScorer,
  proseCraftScorer,
  stakesCostScorer,
}
export { extractProse, inputRecord, normalizeScore, outputToString, toMastraJudgingModel } from './shared'
