import { characters } from '@/db/schema'
import { db } from '@/db/client'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { CharacterData } from './character-tools-schema'
import { DEFAULT_CHARACTER_ROLE } from './manage-tools-wire'

type CharacterRow = typeof characters.$inferSelect

function psychologyRecord(value: unknown): Record<string, unknown> | undefined {
  return value == null ? undefined : recordFromJson(value)
}

export function characterResponse(character: CharacterRow) {
  return {
    id: character.id,
    projectId: character.projectId,
    name: character.name,
    role: character.role,
    description: character.description ?? undefined,
    shortDescription: character.description ?? undefined,
    gender: character.gender ?? undefined,
    mbti: character.mbti ?? undefined,
    voiceSignature: character.voiceSignature ?? undefined,
    portraitUrl: character.portraitUrl ?? undefined,
    psychology: psychologyRecord(character.psychology),
    valence: character.valence ?? undefined,
    arousal: character.arousal ?? undefined,
    autonomy: character.autonomy ?? undefined,
    competence: character.competence ?? undefined,
    relatedness: character.relatedness ?? undefined,
  }
}

function characterMetricDefaults(data: CharacterData) {
  return {
    valence: data.valence ?? 0,
    arousal: data.arousal ?? 50,
    autonomy: data.autonomy ?? 60,
    competence: data.competence ?? 60,
    relatedness: data.relatedness ?? 50,
    cognitiveClarity: data.cognitiveClarity ?? 70,
    perceivedStakes: data.perceivedStakes ?? 40,
    socialSafety: data.socialSafety ?? 60,
    moralAlignment: data.moralAlignment ?? 70,
    transformationProgress: data.transformationProgress ?? 0,
  }
}

function buildCharacterInsertValues(projectId: string, data: CharacterData) {
  return {
    id: uuidv4(),
    projectId,
    name: data.name,
    role: data.role ?? DEFAULT_CHARACTER_ROLE,
    description: data.shortDescription ?? data.description ?? null,
    gender: data.gender ?? null,
    mbti: data.mbti ?? null,
    voiceSignature: data.voiceSignature ?? null,
    portraitUrl: data.portraitUrl ?? null,
    characterPrompt: data.characterPrompt ?? null,
    psychology: data.psychology ?? null,
    ...characterMetricDefaults(data),
  }
}

function applyCharacterProfileFields(
  updateFields: Partial<typeof characters.$inferInsert>,
  data: CharacterData,
) {
  if (data.name !== undefined) updateFields.name = data.name
  if (data.role !== undefined) updateFields.role = data.role
  if (data.description !== undefined) updateFields.description = data.description
  if (data.shortDescription !== undefined) updateFields.description = data.shortDescription
  if (data.gender !== undefined) updateFields.gender = data.gender
  if (data.mbti !== undefined) updateFields.mbti = data.mbti
  if (data.voiceSignature !== undefined) updateFields.voiceSignature = data.voiceSignature
  if (data.portraitUrl !== undefined) updateFields.portraitUrl = data.portraitUrl
  if (data.characterPrompt !== undefined) updateFields.characterPrompt = data.characterPrompt
}

function applyCharacterMetricFields(
  updateFields: Partial<typeof characters.$inferInsert>,
  data: CharacterData,
) {
  if (data.valence !== undefined) updateFields.valence = data.valence
  if (data.arousal !== undefined) updateFields.arousal = data.arousal
  if (data.autonomy !== undefined) updateFields.autonomy = data.autonomy
  if (data.competence !== undefined) updateFields.competence = data.competence
  if (data.relatedness !== undefined) updateFields.relatedness = data.relatedness
  if (data.cognitiveClarity !== undefined) updateFields.cognitiveClarity = data.cognitiveClarity
  if (data.perceivedStakes !== undefined) updateFields.perceivedStakes = data.perceivedStakes
  if (data.socialSafety !== undefined) updateFields.socialSafety = data.socialSafety
  if (data.moralAlignment !== undefined) updateFields.moralAlignment = data.moralAlignment
  if (data.transformationProgress !== undefined) {
    updateFields.transformationProgress = data.transformationProgress
  }
}

function buildCharacterUpdateFields(
  existing: CharacterRow,
  data: CharacterData,
): Partial<typeof characters.$inferInsert> {
  const updateFields: Partial<typeof characters.$inferInsert> = { updatedAt: new Date() }
  applyCharacterProfileFields(updateFields, data)
  applyCharacterMetricFields(updateFields, data)
  if (data.psychology !== undefined) {
    const currentPsych = recordFromJson(existing.psychology)
    updateFields.psychology = { ...currentPsych, ...data.psychology }
  }
  return updateFields
}

export async function createCharacterOperation(projectId: string, data: CharacterData) {
  const existing = await db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.name, data.name)))
    .limit(1)

  if (existing.length > 0) {
    return {
      success: false as const,
      error: `Character "${data.name}" already exists in this project`,
    }
  }

  const insertValues = buildCharacterInsertValues(projectId, data)
  await db.insert(characters).values(insertValues)

  const [created] = await db.select().from(characters).where(eq(characters.id, insertValues.id))

  return {
    success: true as const,
    message: `Created character "${data.name}" (${data.role ?? DEFAULT_CHARACTER_ROLE})`,
    character: characterResponse(created),
  }
}

export async function updateCharacterOperation(characterId: string, data: CharacterData) {
  const [existing] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!existing) {
    return { success: false as const, error: `Character ${characterId} not found` }
  }

  const updateFields = buildCharacterUpdateFields(existing, data)
  await db.update(characters).set(updateFields).where(eq(characters.id, characterId))

  const [updated] = await db.select().from(characters).where(eq(characters.id, characterId))

  return {
    success: true as const,
    message: `Updated character "${updated.name}"`,
    character: characterResponse(updated),
  }
}

export async function deleteCharacterOperation(characterId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!character) {
    return { success: false as const, error: `Character ${characterId} not found` }
  }

  await db.delete(characters).where(eq(characters.id, characterId))
  return { success: true as const, message: `Deleted character "${character.name}"` }
}

export async function getCharacterOperation(characterId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!character) {
    return { success: false as const, error: `Character ${characterId} not found` }
  }
  return { success: true as const, character: characterResponse(character) }
}
