import type { ProjectScope } from '@/shared/auth/project-scope'
import { characters } from '@/db'
import { db } from '@/db/client'
import { eq, and } from 'drizzle-orm'
import { REFERENCE_DISPLAY_CAPTURE } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { CharacterRole } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import { SyncCastFallbackName } from '../constants/action-request-wire'
import {
  resolveInsertMbti,
} from '@/domains/storyteller/services/cast-field-normalize'

function stripEntityLinks(value: unknown): string | undefined {
  return typeof value === 'string'
    ? value.replace(/\[([^\]]+)\]\[[^\]]+\]/g, REFERENCE_DISPLAY_CAPTURE)
    : undefined
}

function normalizeCastPsychology(rawChar: Record<string, unknown>) {
  if (!rawChar.psychology || typeof rawChar.psychology !== 'object') {
    return {}
  }
  return Object.fromEntries(
    Object.entries(recordFromJson(rawChar.psychology)).map(([k, v]) => [k, stripEntityLinks(v)])
  )
}

function normalizeCastEntry(rawCastEntry: unknown): Record<string, unknown> {
  const rawChar = recordFromJson(rawCastEntry)
  return {
    ...rawChar,
    name: stripEntityLinks(rawChar.name),
    description: stripEntityLinks(rawChar.description),
    motivation: stripEntityLinks(rawChar.motivation),
    fatalFlaw: stripEntityLinks(rawChar.fatalFlaw),
    role: stripEntityLinks(rawChar.role),
    gender: stripEntityLinks(rawChar.gender),
    mbti: stripEntityLinks(rawChar.mbti),
    psychology: normalizeCastPsychology(rawChar),
  }
}

function buildExistingCharacterPsychology(
  char: Record<string, unknown>,
  existingPsych: Record<string, unknown> = {}
) {
  return {
    ...existingPsych,
    ...(char.motivation ? { actualMotivation: char.motivation } : {}),
    ...(char.fatalFlaw ? { fatalFlaw: char.fatalFlaw } : {}),
    ...(char.psychology && typeof char.psychology === 'object' ? char.psychology : {}),
  }
}

function buildNewCharacterPsychology(char: Record<string, unknown>) {
  return {
    ...(char.motivation ? { actualMotivation: char.motivation } : {}),
    ...(char.fatalFlaw ? { fatalFlaw: char.fatalFlaw } : {}),
    ...(char.psychology && typeof char.psychology === 'object' ? char.psychology : {}),
  }
}

async function syncExistingCharacter(
  char: Record<string, unknown>,
  current: typeof characters.$inferSelect
) {
  await db
    .update(characters)
    .set({
      role: typeof char.role === 'string' ? char.role : current.role,
      description: typeof char.description === 'string' ? char.description : current.description,
      gender: typeof char.gender === 'string' ? char.gender : current.gender,
      mbti: typeof char.mbti === 'string' ? char.mbti : current.mbti,
      psychology: buildExistingCharacterPsychology(char, recordFromJson(current.psychology)),
      updatedAt: new Date(),
    })
    .where(eq(characters.id, current.id))
}

async function insertNewCharacter(scope: ProjectScope, char: Record<string, unknown>) {
  const name = typeof char.name === 'string' ? char.name : ''
  const description = typeof char.description === 'string' ? char.description : ''
  const providedMbti = typeof char.mbti === 'string' ? char.mbti : undefined
  const mbti = await resolveInsertMbti({ provided: providedMbti, name, description, scope })
  await db.insert(characters).values({
    projectId: scope.projectId,
    name,
    role: typeof char.role === 'string' ? char.role : CharacterRole.Supporting,
    description,
    gender: typeof char.gender === 'string' ? char.gender : undefined,
    mbti,
    psychology: buildNewCharacterPsychology(char),
    valence: 0,
    arousal: 50,
    autonomy: 50,
    competence: 50,
    relatedness: 50,
  })
}

async function syncSingleCastCharacter(scope: ProjectScope, rawCastEntry: unknown) {
  const char = normalizeCastEntry(rawCastEntry)
  if (!char.name || typeof char.name !== 'string') return

  const existing = await db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, scope.projectId), eq(characters.name, char.name)))
    .limit(1)

  if (existing.length > 0) {
    await syncExistingCharacter(char, existing[0])
    return
  }

  await insertNewCharacter(scope, char)
}

export async function syncCastToCharactersTable(
  scope: ProjectScope | undefined,
  castData: unknown
): Promise<void> {
  if (!Array.isArray(castData) || !scope) return

  console.log(`🔄 [API] UPDATE_CAST - Syncing ${castData.length} characters to characters table`)

  for (const rawCastEntry of castData) {
    try {
      await syncSingleCastCharacter(scope, rawCastEntry)
    } catch (err) {
      const char = normalizeCastEntry(rawCastEntry)
      const name = typeof char.name === 'string' ? char.name : SyncCastFallbackName.Unknown
      console.error(`[API] UPDATE_CAST - Failed to sync character ${name}:`, err)
    }
  }
}

export function resolveCastData(payload: Record<string, unknown>): unknown {
  return payload.cast || payload.keyCharacters || payload.characters
}
