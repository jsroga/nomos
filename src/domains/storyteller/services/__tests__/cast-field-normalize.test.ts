import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'

const { generateCharacterMbti } = vi.hoisted(() => ({
  generateCharacterMbti: vi.fn(),
}))

vi.mock('@/domains/storyteller/services/character-mbti-service', async importOriginal => {
  const actual = await importOriginal<
    typeof import('@/domains/storyteller/services/character-mbti-service')
  >()
  return { ...actual, generateCharacterMbti }
})

import { CharacterUnsetSentinel } from '@/domains/storyteller/ui/CharacterPanel/constants/character-panel-metrics'
import { CastUnsetVoice, optionalCastString, resolveInsertMbti } from '../cast-field-normalize'

const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'
const INTJ = 'INTJ'
const DRY_VOICE = 'dry, clipped'

/** A scope cannot be forged, so the test takes the system constructor. */
const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)

describe('optionalCastString', () => {
  it('drops a missing voice so the card can show dashes', () => {
    const voice = optionalCastString(undefined)

    expect(voice).toBeUndefined()
  })

  it('drops the lowercase undefined sentinel', () => {
    const voice = optionalCastString(CastUnsetVoice.Lower)

    expect(voice).toBeUndefined()
  })

  it('drops the title-case Undefined sentinel', () => {
    const voice = optionalCastString(CastUnsetVoice.Title)

    expect(voice).toBeUndefined()
  })

  it('drops blank and whitespace voice strings', () => {
    expect(optionalCastString('')).toBeUndefined()
    expect(optionalCastString('   ')).toBeUndefined()
  })

  it('keeps a real voice signature', () => {
    const voice = optionalCastString(DRY_VOICE)

    expect(voice).toBe(DRY_VOICE)
  })
})

describe('resolveInsertMbti', () => {
  beforeEach(() => {
    generateCharacterMbti.mockReset()
  })

  it('keeps a valid provided type and does not call the model', async () => {
    const mbti = await resolveInsertMbti({
      provided: INTJ,
      name: VERA,
      description: VERA_DESC,
      scope: SCOPE,
    })

    expect(mbti).toBe(INTJ)
    expect(generateCharacterMbti).not.toHaveBeenCalled()
  })

  it('generates when the provided type is the question-mark sentinel', async () => {
    generateCharacterMbti.mockResolvedValue(INTJ)

    const mbti = await resolveInsertMbti({
      provided: CharacterUnsetSentinel.QuestionMarks,
      name: VERA,
      description: VERA_DESC,
      scope: SCOPE,
    })

    expect(mbti).toBe(INTJ)
    expect(generateCharacterMbti).toHaveBeenCalledWith({
      name: VERA,
      description: VERA_DESC,
      scope: SCOPE,
    })
  })

  it('generates when MBTI is missing', async () => {
    generateCharacterMbti.mockResolvedValue('ENTP')

    const mbti = await resolveInsertMbti({
      provided: undefined,
      name: VERA,
      description: VERA_DESC,
      scope: SCOPE,
    })

    expect(mbti).toBe('ENTP')
    expect(generateCharacterMbti).toHaveBeenCalledOnce()
  })

  it('returns undefined when generation fails so the card can show dashes', async () => {
    generateCharacterMbti.mockResolvedValue(undefined)

    const mbti = await resolveInsertMbti({
      provided: CharacterUnsetSentinel.QuestionMarksShort,
      name: VERA,
      description: VERA_DESC,
      scope: SCOPE,
    })

    expect(mbti).toBeUndefined()
  })
})
