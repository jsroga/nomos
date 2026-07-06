import { consistencyScorer } from './consistency-scorer'
import { hallucinationScorer } from './hallucination-scorer'
import { magicScorer } from './magic-scorer'
import { personaFidelityScorer } from './persona-fidelity-scorer'

export const ALL_SCORERS = [
  magicScorer,
  consistencyScorer,
  hallucinationScorer,
  personaFidelityScorer,
] as const

export type EvalScorerId = (typeof ALL_SCORERS)[number]['id']

export type EvalScorer = (typeof ALL_SCORERS)[number]

export { magicScorer, consistencyScorer, hallucinationScorer, personaFidelityScorer }
