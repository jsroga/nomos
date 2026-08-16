import { describe, expect, it } from 'vitest'
import { isCharacterMbti, parseCharacterMbti } from '../character-mbti-service'

describe('parseCharacterMbti', () => {
  it('accepts a bare 4-letter type', () => {
    expect(parseCharacterMbti('intj')).toBe('INTJ')
    expect(parseCharacterMbti('ENTP\n')).toBe('ENTP')
  })

  it('rejects non-MBTI text', () => {
    expect(parseCharacterMbti('maybe an introvert')).toBeUndefined()
    expect(parseCharacterMbti('')).toBeUndefined()
  })
})

describe('isCharacterMbti', () => {
  it('validates provided types', () => {
    expect(isCharacterMbti('INFJ')).toBe(true)
    expect(isCharacterMbti('????')).toBe(false)
    expect(isCharacterMbti(undefined)).toBe(false)
  })
})

describe('parseCharacterMbti extra shapes', () => {
  it('rejects a type with a suffix the model sometimes appends', () => {
    expect(parseCharacterMbti('INTJ-A')).toBeUndefined()
  })

  it('rejects a type buried in a sentence', () => {
    expect(parseCharacterMbti('The type is INTJ')).toBeUndefined()
  })

  it('accepts a type with surrounding whitespace', () => {
    expect(parseCharacterMbti('  estp  ')).toBe('ESTP')
  })
})
