import { z } from 'zod'
import {
  CharacterMetricFieldKey,
  CharacterMetricRange,
  clampCharacterMetricValue,
  clampNumberToRange,
} from '@/domains/storyteller/core/character-missing-fields'

function preprocessClampedMetric(key: CharacterMetricFieldKey) {
  return (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return value
    return clampCharacterMetricValue(key, value)
  }
}

export function clampedCharacterMetricSchema(key: CharacterMetricFieldKey) {
  const min =
    key === CharacterMetricFieldKey.Valence
      ? CharacterMetricRange.ValenceMin
      : CharacterMetricRange.UnitMin
  return z.preprocess(
    preprocessClampedMetric(key),
    z.number().min(min).max(CharacterMetricRange.Max),
  )
}

export function clampedUnitMetricSchema() {
  return z.preprocess((value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return value
    return clampNumberToRange(value, CharacterMetricRange.UnitMin, CharacterMetricRange.Max)
  }, z.number().min(CharacterMetricRange.UnitMin).max(CharacterMetricRange.Max))
}

export const characterPsychologyMetricsSchema = z.object({
  [CharacterMetricFieldKey.Valence]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Valence),
  [CharacterMetricFieldKey.Arousal]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Arousal),
  [CharacterMetricFieldKey.Autonomy]: clampedCharacterMetricSchema(CharacterMetricFieldKey.Autonomy),
  [CharacterMetricFieldKey.Competence]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.Competence,
  ),
  [CharacterMetricFieldKey.Relatedness]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.Relatedness,
  ),
  [CharacterMetricFieldKey.CognitiveClarity]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.CognitiveClarity,
  ),
  [CharacterMetricFieldKey.PerceivedStakes]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.PerceivedStakes,
  ),
  [CharacterMetricFieldKey.SocialSafety]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.SocialSafety,
  ),
  [CharacterMetricFieldKey.MoralAlignment]: clampedCharacterMetricSchema(
    CharacterMetricFieldKey.MoralAlignment,
  ),
})
