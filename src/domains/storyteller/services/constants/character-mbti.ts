import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'

export const CHARACTER_MBTI_MODEL = TEXT_GEN_FAST_MODEL
export const CHARACTER_MBTI_TEMPERATURE = 0.2
export const CHARACTER_MBTI_FAILED_LOG = '[CharacterMbti] Generation failed:'

export const CHARACTER_MBTI_PATTERN = /^[EI][NS][FT][JP]$/i

export enum CharacterMbtiCopy {
  System = 'You assign a 4-letter MBTI type to a fictional character. Reply with only the type, like INTJ.',
}

export function characterMbtiUserPrompt(name: string, description: string): string {
  return `Name: ${name}
Description: ${description}

MBTI:`
}

export function parseCharacterMbti(text: string): string | undefined {
  const match = text.trim().toUpperCase().match(CHARACTER_MBTI_PATTERN)
  return match ? match[0] : undefined
}
