import { createOpenAI } from '@ai-sdk/openai'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'
import { generateText } from 'ai'
import {
  CHARACTER_MBTI_FAILED_LOG,
  CHARACTER_MBTI_MODEL,
  CHARACTER_MBTI_PATTERN,
  CHARACTER_MBTI_TEMPERATURE,
  CharacterMbtiCopy,
  characterMbtiUserPrompt,
  parseCharacterMbti,
} from '@/domains/storyteller/services/constants/character-mbti'

export { parseCharacterMbti }

export function isCharacterMbti(value: string | undefined): boolean {
  return Boolean(value && CHARACTER_MBTI_PATTERN.test(value))
}

export async function generateCharacterMbti(input: {
  name: string
  description: string
}): Promise<string | undefined> {
  try {
    const openRouter = openRouterClientConfig()
    const openrouter = createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })
    const { text } = await generateText({
      model: openrouter(CHARACTER_MBTI_MODEL),
      system: CharacterMbtiCopy.System,
      prompt: characterMbtiUserPrompt(input.name, input.description),
      maxRetries: 1,
      temperature: CHARACTER_MBTI_TEMPERATURE,
    })
    return parseCharacterMbti(text)
  } catch (error) {
    console.error(CHARACTER_MBTI_FAILED_LOG, error)
    return undefined
  }
}
