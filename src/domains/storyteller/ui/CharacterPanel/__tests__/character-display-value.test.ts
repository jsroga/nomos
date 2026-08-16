import { describe, expect, it } from 'vitest'
import { CharacterMissingValue, CharacterUnsetSentinel } from '../constants/character-panel-metrics'
import { characterDisplayValue } from '../character-display-value'

describe('characterDisplayValue', () => {
  it('returns dashes for missing or sentinel values', () => {
    expect(characterDisplayValue(undefined)).toBe(CharacterMissingValue.Dash)
    expect(characterDisplayValue('')).toBe(CharacterMissingValue.Dash)
    expect(characterDisplayValue('????')).toBe(CharacterMissingValue.Dash)
    expect(characterDisplayValue('undefined')).toBe(CharacterMissingValue.Dash)
    expect(characterDisplayValue('Undefined')).toBe(CharacterMissingValue.Dash)
  })

  it('keeps a real MBTI or voice string', () => {
    expect(characterDisplayValue('INTJ')).toBe('INTJ')
    expect(characterDisplayValue('dry, clipped')).toBe('dry, clipped')
  })

  it('treats the three-question-mark sentinel as missing', () => {
    expect(characterDisplayValue(CharacterUnsetSentinel.QuestionMarksShort)).toBe(
      CharacterMissingValue.Dash,
    )
  })

  it('trims whitespace before deciding a value is real', () => {
    expect(characterDisplayValue('  INTJ  ')).toBe('INTJ')
    expect(characterDisplayValue('   ')).toBe(CharacterMissingValue.Dash)
  })
})
