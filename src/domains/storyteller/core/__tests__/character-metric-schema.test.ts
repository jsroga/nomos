import { describe, expect, it } from 'vitest'
import { CharacterMetricFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import {
  characterPsychologyMetricsSchema,
  clampedCharacterMetricSchema,
} from '@/domains/storyteller/core/character-metric-schema'

describe('clampedCharacterMetricSchema', () => {
  it('maps a negative moralAlignment onto 0 instead of rejecting', () => {
    expect(
      clampedCharacterMetricSchema(CharacterMetricFieldKey.MoralAlignment).parse(-2.5),
    ).toBe(0)
  })

  it('keeps a valid valence on the bipolar scale', () => {
    expect(clampedCharacterMetricSchema(CharacterMetricFieldKey.Valence).parse(-2)).toBe(-2)
  })

  it('clamps a full generate-metrics payload', () => {
    const parsed = characterPsychologyMetricsSchema.parse({
      [CharacterMetricFieldKey.Valence]: -2,
      [CharacterMetricFieldKey.Arousal]: 3,
      [CharacterMetricFieldKey.Autonomy]: 60,
      [CharacterMetricFieldKey.Competence]: 60,
      [CharacterMetricFieldKey.Relatedness]: 50,
      [CharacterMetricFieldKey.CognitiveClarity]: 70,
      [CharacterMetricFieldKey.PerceivedStakes]: 5,
      [CharacterMetricFieldKey.SocialSafety]: 60,
      [CharacterMetricFieldKey.MoralAlignment]: -2.5,
    })
    expect(parsed[CharacterMetricFieldKey.MoralAlignment]).toBe(0)
    expect(parsed[CharacterMetricFieldKey.Valence]).toBe(-2)
  })
})
