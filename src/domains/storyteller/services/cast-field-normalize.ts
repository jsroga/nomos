import {
  generateCharacterMbti,
  isCharacterMbti,
} from '@/domains/storyteller/services/character-mbti-service'

export enum CastUnsetVoice {
  Lower = 'undefined',
  Title = 'Undefined',
}

export function optionalCastString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === CastUnsetVoice.Lower || trimmed === CastUnsetVoice.Title) {
    return undefined
  }
  return trimmed
}

export async function resolveInsertMbti(input: {
  provided: string | undefined
  name: string
  description: string
}): Promise<string | undefined> {
  if (isCharacterMbti(input.provided)) return input.provided
  return generateCharacterMbti({ name: input.name, description: input.description })
}
