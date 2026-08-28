import type { ProjectScope } from '@/shared/auth/project-scope'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
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
  scope: ProjectScope
}): Promise<string | undefined> {
  try {
    const { text } = await complete({
      scope: input.scope,
      feature: LlmFeature.StorytellerCharacterMbti,
      model: CHARACTER_MBTI_MODEL,
      system: CharacterMbtiCopy.System,
      prompt: characterMbtiUserPrompt(input.name, input.description),
      temperature: CHARACTER_MBTI_TEMPERATURE,
    })
    return parseCharacterMbti(text)
  } catch (error) {
    console.error(CHARACTER_MBTI_FAILED_LOG, error)
    return undefined
  }
}
