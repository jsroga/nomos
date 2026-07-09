import { readNumber, readString, recordFromJson } from '@/shared/data/json-guards'
import type { CharacterMetrics } from '@/domains/storyteller/core/types/StoryTypes'

/** UI / API character shape (camelCase; normalized at boundaries). */
export interface StorytellerCharacter {
  id: string
  name: string
  role: string
  gender?: string
  description?: string
  archetype?: string
  characterPrompt?: string
  psychology?: Record<string, unknown>
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number
  perceivedStakes?: number
  socialSafety?: number
  moralAlignment?: number
  transformation?: number
  mbti?: string
  voiceSignature?: string
  portraitUrl?: string
}

export interface CharacterDialogInitial {
  id?: string
  name?: string
  description?: string
  role?: string
  gender?: string
  mbti?: string
  portraitUrl?: string
  voiceSignature?: string
  archetype?: string
  psychology?: Record<string, unknown>
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number
  perceivedStakes?: number
  socialSafety?: number
  moralAlignment?: number
}

function metricKeySnake(camel: string): string {
  return camel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/** Read a metric from camelCase or legacy snake_case row fields. */
export function readCharacterMetric(
  source: StorytellerCharacter | Record<string, unknown>,
  key: keyof CharacterMetrics
): number | undefined {
  const direct = source[key]
  if (typeof direct === 'number') return direct
  const record = recordFromJson(source)
  return readNumber(record[key]) ?? readNumber(record[metricKeySnake(key)])
}

export function characterPortraitUrl(
  source: StorytellerCharacter | Record<string, unknown>
): string | undefined {
  const direct = 'portraitUrl' in source ? source.portraitUrl : undefined
  if (typeof direct === 'string' && direct.length > 0) return direct
  const record = recordFromJson(source)
  return readString(record.portraitUrl) ?? readString(record.portrait_url)
}

/** Normalize API / DB row to UI character (camelCase). */
export function storytellerCharacterFromRow(row: unknown): StorytellerCharacter | null {
  const record = recordFromJson(row)
  const id = readString(record.id)
  const name = readString(record.name)
  if (!id || !name) return null

  const psychology = recordFromJson(record.psychology)
  const psychologyValue = Object.keys(psychology).length > 0 ? psychology : undefined

  return {
    id,
    name,
    role: readString(record.role) ?? '',
    gender: readString(record.gender),
    description: readString(record.description) ?? readString(record.character_prompt),
    archetype: readString(record.archetype),
    characterPrompt: readString(record.characterPrompt) ?? readString(record.character_prompt),
    psychology: psychologyValue,
    valence: readCharacterMetric(record, 'valence'),
    arousal: readCharacterMetric(record, 'arousal'),
    autonomy: readCharacterMetric(record, 'autonomy'),
    competence: readCharacterMetric(record, 'competence'),
    relatedness: readCharacterMetric(record, 'relatedness'),
    cognitiveClarity: readCharacterMetric(record, 'cognitiveClarity'),
    perceivedStakes: readCharacterMetric(record, 'perceivedStakes'),
    socialSafety: readCharacterMetric(record, 'socialSafety'),
    moralAlignment: readCharacterMetric(record, 'moralAlignment'),
    transformation:
      readNumber(record.transformation) ??
      readNumber(record.transformationProgress) ??
      readNumber(record.transformation_progress),
    mbti: readString(record.mbti),
    voiceSignature: readString(record.voiceSignature) ?? readString(record.voice_signature),
    portraitUrl: characterPortraitUrl(record),
  }
}

export function characterToDialogInitial(character: StorytellerCharacter): CharacterDialogInitial {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    gender: character.gender,
    mbti: character.mbti,
    description: character.description ?? character.characterPrompt,
    portraitUrl: character.portraitUrl,
    voiceSignature: character.voiceSignature,
    archetype: character.archetype,
    psychology: character.psychology,
    valence: character.valence,
    arousal: character.arousal,
    autonomy: character.autonomy,
    competence: character.competence,
    relatedness: character.relatedness,
    cognitiveClarity: character.cognitiveClarity,
    perceivedStakes: character.perceivedStakes,
    socialSafety: character.socialSafety,
    moralAlignment: character.moralAlignment,
  }
}
