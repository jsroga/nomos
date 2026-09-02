import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { characters } from '@/db'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { and, eq, sql } from 'drizzle-orm'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ApiRoutePath,
  AppModuleId,
  CharacterRole,
  ContentType,
  CrossDomainSuggestionCopy,
  CrossDomainSuggestionType,
  GameEntityKind,
  HttpMethod,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { DEFAULT_BASE_URL } from '@/shared/data/constants/url'

interface CreateCharacterBody {
  projectId: string
  name: string
  role?: string
  gender?: string
  characterPrompt?: string
  description?: string
  portraitUrl?: string
  stress?: number
  trust?: number
  power?: number
  morality?: number
  hope?: number
  isolation?: number
  transformation?: number
  mbti?: string
}

export async function createCharacterRecord(body: CreateCharacterBody, userId: string) {
  const {
    projectId,
    name,
    role,
    gender,
    characterPrompt,
    stress,
    trust,
    power,
    morality,
    hope,
    isolation,
    transformation,
    mbti,
    description,
    portraitUrl,
  } = body

  if (!projectId || !name) {
    return NextResponse.json(
      { error: API_ERROR.CHARACTER_PROJECT_AND_NAME_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  if (!(await tryProjectScope(projectId, userId))) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
  }

  const existingCharacters = await db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, projectId), sql`lower(${characters.name}) = lower(${name})`))
    .limit(1)

  if (existingCharacters.length > 0) {
    console.log(`[Character API] Returning existing character for: ${name}`)
    return NextResponse.json(existingCharacters[0])
  }

  const [newCharacter] = await db
    .insert(characters)
    .values({
      projectId,
      name,
      role: role || CharacterRole.Supporting,
      gender,
      characterPrompt,
      description,
      portraitUrl,
      moralAlignment: morality ?? 70,
      transformationProgress: transformation ?? 0,
      mbti,
      valence: 0,
      arousal: stress ?? 50,
      autonomy: power ? power * 0.6 + 20 : 60,
      competence: 60,
      relatedness: isolation ? 100 - isolation : 50,
      cognitiveClarity: 70,
      perceivedStakes: 40,
      socialSafety: trust ?? 60,
    })
    .returning()

  const entityId = await createCharacterGameEntity({
    projectId,
    userId,
    name,
    characterId: newCharacter.id,
    role,
    gender,
    mbti,
    description,
    characterPrompt,
    portraitUrl,
    metrics: { stress, trust, power, morality, hope, isolation, transformation },
  })

  return NextResponse.json({
    ...newCharacter,
    _suggestions: buildCharacterSuggestions({
      characterId: newCharacter.id,
      projectId,
      name,
      role,
      entityId,
    }),
  })
}

async function createCharacterGameEntity(input: {
  projectId: string
  userId: string
  name: string
  characterId: string
  role?: string
  gender?: string
  mbti?: string
  description?: string
  characterPrompt?: string
  portraitUrl?: string
  metrics: Record<string, unknown>
}): Promise<string | null> {
  try {
    const entityResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`,
      {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          projectId: input.projectId,
          userId: input.userId,
          entityType: GameEntityKind.Character,
          name: input.name,
          description: input.description || input.characterPrompt,
          sourceDomain: AppModuleId.Storyteller,
          sourceEntityId: input.characterId,
          metadata: {
            role: input.role,
            gender: input.gender,
            mbti: input.mbti,
            metrics: input.metrics,
          },
          imageUrl: input.portraitUrl,
          tags: [input.role || CharacterRole.Supporting, input.gender].filter(Boolean),
        }),
      }
    )

    if (entityResponse.ok) {
      const { entity } = await entityResponse.json()
      return entity?.id ?? null
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.CHARACTER_ENTITY_CREATE_FAILED, error)
  }
  return null
}

function buildCharacterSuggestions(input: {
  characterId: string
  projectId: string
  name: string
  role?: string
  entityId: string | null
}) {
  const entityRef = input.entityId || input.characterId
  return [
    {
      id: `char-to-mechanics-${input.characterId}`,
      type: CrossDomainSuggestionType.CrossDomain,
      title: `Design mechanics for ${input.name}`,
      description: CrossDomainSuggestionCopy.CharToMechanicsDescription,
      targetDomain: AppModuleId.LoopCreator,
      targetRoute: `/${input.projectId}/loop-creator`,
      autoMessage: `Design combat and movement mechanics for @${input.name}. Consider their role${input.role ? ` as ${input.role}` : ''}.`,
      priority: 5,
      entityId: entityRef,
    },
    {
      id: `char-to-home-${input.characterId}`,
      type: CrossDomainSuggestionType.CrossDomain,
      title: `Build ${input.name}'s home`,
      description: CrossDomainSuggestionCopy.CharToHomeDescription,
      targetDomain: AppModuleId.InteriorDesigner,
      targetRoute: `/${input.projectId}/3d-canvas`,
      priority: 3,
      entityId: entityRef,
    },
  ]
}

function assignDirectCharacterFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body.name !== undefined) dbUpdates.name = body.name
  if (body.role !== undefined) dbUpdates.role = body.role
  if (body.gender !== undefined) dbUpdates.gender = body.gender
  if (body.characterPrompt !== undefined) dbUpdates.characterPrompt = body.characterPrompt
  if (body.mbti !== undefined) dbUpdates.mbti = body.mbti
  if (body.psychology !== undefined) dbUpdates.psychology = body.psychology
  if (body.description !== undefined) dbUpdates.description = body.description
  if (body.portraitUrl !== undefined) dbUpdates.portraitUrl = body.portraitUrl
}

function assignCharacterMetricFields(
  body: Record<string, unknown>,
  dbUpdates: Record<string, unknown>
): void {
  if (body.morality !== undefined) dbUpdates.moralAlignment = body.morality
  if (body.transformation !== undefined) dbUpdates.transformationProgress = body.transformation
  if (body.stress !== undefined) dbUpdates.arousal = body.stress
  if (body.trust !== undefined) dbUpdates.socialSafety = body.trust
  if (body.power !== undefined) dbUpdates.autonomy = Math.floor(Number(body.power) * 0.6 + 20)
  if (body.isolation !== undefined) dbUpdates.relatedness = 100 - Number(body.isolation)
}

export function buildCharacterPatchUpdates(body: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {}
  assignDirectCharacterFields(body, dbUpdates)
  assignCharacterMetricFields(body, dbUpdates)
  return dbUpdates
}
