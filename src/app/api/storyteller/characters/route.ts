import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { characters } from '@/db'
import { verifyCharacterAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { eq, desc, and, sql } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { buildUrl, joinUrlPath } from '@/shared/data/url-builder'
import {
  QueryParam,
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
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { readRowString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'

/**
 * @openapi
 * /api/storyteller/characters:
 *   get:
 *     summary: List characters
 *     description: Retrieves all characters for a project
 *     tags:
 *       - Storyteller Characters
 *     parameters:
 *       - name: projectId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID to filter characters
 *     responses:
 *       200:
 *         description: A list of characters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Character'
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a character
 *     description: Creates a new character in a project
 *     tags:
 *       - Storyteller Characters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CharacterInput'
 *     responses:
 *       200:
 *         description: The created character
 *       400:
 *         description: Project ID and Name are required
 *       500:
 *         description: Server error
 *   patch:
 *     summary: Update a character
 *     description: Updates an existing character
 *     tags:
 *       - Storyteller Characters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - type: object
 *                 required:
 *                   - id
 *                 properties:
 *                   id:
 *                     type: string
 *               - $ref: '#/components/schemas/CharacterInput'
 *     responses:
 *       200:
 *         description: The updated character
 *       400:
 *         description: Character ID is required
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a character
 *     description: Deletes a character by ID
 *     tags:
 *       - Storyteller Characters
 *     parameters:
 *       - name: id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The character ID to delete
 *     responses:
 *       200:
 *         description: Success confirmation
 *       400:
 *         description: Character ID is required
 *       500:
 *         description: Server error
 *
 * components:
 *   schemas:
 *     Character:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [Lead, Supporting, Background]
 *         gender:
 *           type: string
 *         characterPrompt:
 *           type: string
 *         description:
 *           type: string
 *         portraitUrl:
 *           type: string
 *         stressLevel:
 *           type: integer
 *         trustLevel:
 *           type: integer
 *         powerLevel:
 *           type: integer
 *         moralityLevel:
 *           type: integer
 *         hopeLevel:
 *           type: integer
 *         isolationLevel:
 *           type: integer
 *         transformationProgress:
 *           type: integer
 *         mbti:
 *           type: string
 *         voiceSignature:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CharacterInput:
 *       type: object
 *       properties:
 *         projectId:
 *           type: string
 *         name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [Lead, Supporting, Background]
 *         gender:
 *           type: string
 *         characterPrompt:
 *           type: string
 *         description:
 *           type: string
 *         portraitUrl:
 *           type: string
 *         stress:
 *           type: integer
 *           description: Stress level (0-100)
 *         trust:
 *           type: integer
 *           description: Trust level (0-100)
 *         power:
 *           type: integer
 *           description: Power level (0-100)
 *         morality:
 *           type: integer
 *           description: Morality level (0-100)
 *         hope:
 *           type: integer
 *           description: Hope level (0-100)
 *         isolation:
 *           type: integer
 *           description: Isolation level (0-100)
 *         transformation:
 *           type: integer
 *           description: Transformation progress (0-100)
 *         mbti:
 *           type: string
 *           description: MBTI personality type
 *         voiceSignature:
 *           type: string
 *           description: Character voice/speech pattern description
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get(QueryParam.ProjectId)

  if (!projectId) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const result = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(desc(characters.createdAt))
    return NextResponse.json(result)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_FETCH_CHARACTERS_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_CHARACTERS }, { status: HttpStatus.INTERNAL })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const body = await req.json()
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
      voiceSignature,
      description,
      portraitUrl,
    } = body

    if (!projectId || !name) {
      return NextResponse.json({ error: API_ERROR.CHARACTER_PROJECT_AND_NAME_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    // Idempotency check: Check if character with same name exists in project
    const existingCharacters = await db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.projectId, projectId),
          // Case-insensitive name match
          sql`lower(${characters.name}) = lower(${name})`
        )
      )
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
        // Legacy metrics mapped to new schema where possible or dropped
        // stressLevel: stress ?? 30, // Dropped
        // trustLevel: trust ?? 50, // Dropped
        // powerLevel: power ?? 30, // Dropped
        moralAlignment: morality ?? 70, // Mapped from morality
        // hopeLevel: hope ?? 60, // Dropped
        // isolationLevel: isolation ?? 20, // Dropped
        transformationProgress: transformation ?? 0,
        mbti,
        voiceSignature,
        // Default new metrics
        valence: 0,
        arousal: stress ?? 50, // Map stress to arousal as proxy?
        autonomy: power ? power * 0.6 + 20 : 60, // Rough proxy
        competence: 60,
        relatedness: isolation ? 100 - isolation : 50, // Inverse isolation
        cognitiveClarity: 70,
        perceivedStakes: 40,
        socialSafety: trust ?? 60, // Trust -> Safety proxy
      })
      .returning()

    // Create game entity for cross-domain visibility
    let entityId: string | null = null
    try {
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`,
        {
          method: HttpMethod.Post,
          headers: { 'Content-Type': ContentType.Json },
          body: JSON.stringify({
            projectId,
            userId: session.user.id,
            entityType: GameEntityKind.Character,
            name,
            description: description || characterPrompt,
            sourceDomain: AppModuleId.Storyteller,
            sourceEntityId: newCharacter.id,
            metadata: {
              role,
              gender,
              mbti,
              voiceSignature,
              metrics: { stress, trust, power, morality, hope, isolation, transformation },
            },
            imageUrl: portraitUrl,
            tags: [role || CharacterRole.Supporting, gender].filter(Boolean),
          }),
        }
      )

      if (entityResponse.ok) {
        const { entity } = await entityResponse.json()
        entityId = entity?.id
      }
    } catch (error) {
      console.error(API_LOG_PREFIX.CHARACTER_ENTITY_CREATE_FAILED, error)
      // Don't fail the character creation if entity creation fails
    }

    // Generate cross-domain suggestions
    const suggestions = [
      {
        id: `char-to-mechanics-${newCharacter.id}`,
        type: CrossDomainSuggestionType.CrossDomain,
        title: `Design mechanics for ${name}`,
        description: CrossDomainSuggestionCopy.CharToMechanicsDescription,
        targetDomain: AppModuleId.LoopCreator,
        targetRoute: `/${projectId}/loop-creator`,
        autoMessage: `Design combat and movement mechanics for @${name}. Consider their role${role ? ` as ${role}` : ''}.`,
        priority: 5,
        entityId: entityId || newCharacter.id,
      },
      {
        id: `char-to-home-${newCharacter.id}`,
        type: CrossDomainSuggestionType.CrossDomain,
        title: `Build ${name}'s home`,
        description: CrossDomainSuggestionCopy.CharToHomeDescription,
        targetDomain: AppModuleId.InteriorDesigner,
        targetRoute: `/${projectId}/interior-design`,
        priority: 3,
        entityId: entityId || newCharacter.id,
      },
    ]

    return NextResponse.json({
      ...newCharacter,
      _suggestions: suggestions,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_CREATE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const body = await req.json()
    const {
      id,
      name,
      role,
      gender,
      characterPrompt,
      stress,
      trust,
      power,
      morality,
      isolation,
      transformation,
      mbti,
      voiceSignature,
      psychology,
      description,
      portraitUrl,
    } = body

    if (!id) {
      return NextResponse.json({ error: API_ERROR.CHARACTER_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const access = await verifyCharacterAccess(id, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    // Build update object with only valid fields
    const dbUpdates: Record<string, unknown> = {}

    if (name !== undefined) dbUpdates.name = name
    if (role !== undefined) dbUpdates.role = role
    if (gender !== undefined) dbUpdates.gender = gender
    if (characterPrompt !== undefined) dbUpdates.characterPrompt = characterPrompt
    if (mbti !== undefined) dbUpdates.mbti = mbti
    if (voiceSignature !== undefined) dbUpdates.voiceSignature = voiceSignature
    if (psychology !== undefined) dbUpdates.psychology = psychology
    if (description !== undefined) dbUpdates.description = description
    if (portraitUrl !== undefined) dbUpdates.portraitUrl = portraitUrl

    // Metrics
    if (morality !== undefined) dbUpdates.moralAlignment = morality
    if (transformation !== undefined) dbUpdates.transformationProgress = transformation

    // Approximate mappings for new schema if legacy values provided
    if (stress !== undefined) dbUpdates.arousal = stress
    if (trust !== undefined) dbUpdates.socialSafety = trust
    if (power !== undefined) dbUpdates.autonomy = Math.floor(power * 0.6 + 20)
    if (isolation !== undefined) dbUpdates.relatedness = 100 - isolation

    const [updatedCharacter] = await db
      .update(characters)
      .set({ ...dbUpdates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_UPDATE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get(QueryParam.Id)

  if (!id) {
    return NextResponse.json({ error: API_ERROR.CHARACTER_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const access = await verifyCharacterAccess(id, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    // Get character to find associated entity
    const [character] = await db.select().from(characters).where(eq(characters.id, id))

    await db.delete(characters).where(eq(characters.id, id))

    // Delete associated game entity
    if (character) {
      try {
        const entitiesResponse = await fetch(
          buildUrl(`${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`, { [QueryParam.ProjectId]: character.projectId, sourceDomain: AppModuleId.Storyteller })
        )
        const entitiesPayload = recordFromJson(await entitiesResponse.json())
        const entities = recordArrayFromJson(entitiesPayload.entities)
        const entity = entities.find(row => readRowString(row, DB_COLUMN.SOURCE_ENTITY_ID) === id)
        const entityId = entity ? readRowString(entity, DB_COLUMN.ID) : undefined

        if (entityId) {
          await fetch(
            joinUrlPath(`${process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE_URL}${ApiRoutePath.Entities}`, entityId),
            { method: HttpMethod.Delete }
          )
        }
      } catch (error) {
        console.error(API_LOG_PREFIX.CHARACTER_ENTITY_DELETE_FAILED, error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_DELETE_CHARACTER_LOG, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_CHARACTER }, { status: HttpStatus.INTERNAL })
  }
}
