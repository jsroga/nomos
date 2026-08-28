import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The seam is the gateway, not the AI SDK: the service calls `complete`, which
 * is also what meters the call. Mocking `ai` would let the recorder try to
 * reach a database.
 */
const { complete } = vi.hoisted(() => ({ complete: vi.fn() }))
vi.mock('@/shared/ai/gateway', () => ({ complete }))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { generateCharacterMbti } from '../character-mbti-service'
import { characterMbtiUserPrompt } from '../constants/character-mbti'

/** A scope cannot be forged, so the test takes the system constructor. */
const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)

const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'

describe('generateCharacterMbti', () => {
  beforeEach(() => {
    complete.mockReset()
  })

  it('returns a parsed type when the model replies with only MBTI', async () => {
    complete.mockResolvedValue({ text: 'infj' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC, scope: SCOPE })

    expect(mbti).toBe('INFJ')
  })

  it('returns undefined when the model writes a sentence instead of a type', async () => {
    complete.mockResolvedValue({ text: 'She is probably an INTJ strategist.' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC, scope: SCOPE })

    expect(mbti).toBeUndefined()
  })

  it('returns undefined when the model call throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    complete.mockRejectedValue(new Error('quota'))

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC, scope: SCOPE })

    expect(mbti).toBeUndefined()
    errorSpy.mockRestore()
  })

  it('sends the character name and description in the user prompt', async () => {
    complete.mockResolvedValue({ text: 'ENTP' })

    await generateCharacterMbti({ name: VERA, description: VERA_DESC, scope: SCOPE })

    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: characterMbtiUserPrompt(VERA, VERA_DESC),
      }),
    )
  })

  it('returns undefined for an empty model reply', async () => {
    complete.mockResolvedValue({ text: '' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC, scope: SCOPE })

    expect(mbti).toBeUndefined()
  })
})
