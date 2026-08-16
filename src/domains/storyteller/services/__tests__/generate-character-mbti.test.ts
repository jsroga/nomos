import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generateText } = vi.hoisted(() => ({
  generateText: vi.fn(),
}))

vi.mock('ai', () => ({ generateText }))
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => (modelId: string) => modelId,
}))
vi.mock('@/shared/agent-kernel/models', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/agent-kernel/models')>()
  return {
    ...actual,
    openRouterClientConfig: () => ({ apiKey: 'test-key', baseURL: 'https://openrouter.example' }),
  }
})

import { generateCharacterMbti } from '../character-mbti-service'
import { characterMbtiUserPrompt } from '../constants/character-mbti'

const VERA = 'Vera'
const VERA_DESC = 'Vera keeps the wardens at bay.'

describe('generateCharacterMbti', () => {
  beforeEach(() => {
    generateText.mockReset()
  })

  it('returns a parsed type when the model replies with only MBTI', async () => {
    generateText.mockResolvedValue({ text: 'infj' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC })

    expect(mbti).toBe('INFJ')
  })

  it('returns undefined when the model writes a sentence instead of a type', async () => {
    generateText.mockResolvedValue({ text: 'She is probably an INTJ strategist.' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC })

    expect(mbti).toBeUndefined()
  })

  it('returns undefined when the model call throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    generateText.mockRejectedValue(new Error('quota'))

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC })

    expect(mbti).toBeUndefined()
    errorSpy.mockRestore()
  })

  it('sends the character name and description in the user prompt', async () => {
    generateText.mockResolvedValue({ text: 'ENTP' })

    await generateCharacterMbti({ name: VERA, description: VERA_DESC })

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: characterMbtiUserPrompt(VERA, VERA_DESC),
      }),
    )
  })

  it('returns undefined for an empty model reply', async () => {
    generateText.mockResolvedValue({ text: '' })

    const mbti = await generateCharacterMbti({ name: VERA, description: VERA_DESC })

    expect(mbti).toBeUndefined()
  })
})
