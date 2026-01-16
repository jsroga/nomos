import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/domains/storyteller/db/schema'
import { gameEntities } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

async function verifyProjectAccess(projectId: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project || project.userId !== userId) {
    return false
  }
  return true
}

async function verifyCharacterAccess(characterId: string, userId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!character) return false

  const [project] = await db.select().from(projects).where(eq(projects.id, character.projectId))
  if (!project || project.userId !== userId) {
    return false
  }
  return true
}

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
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const result = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(desc(characters.createdAt))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch characters:', error)
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      return NextResponse.json({ error: 'Project ID and Name are required' }, { status: 400 })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [newCharacter] = await db
      .insert(characters)
      .values({
        projectId,
        name,
        role: role || 'Supporting',
        gender,
        characterPrompt,
        description,
        portraitUrl,
        stressLevel: stress ?? 30,
        trustLevel: trust ?? 50,
        powerLevel: power ?? 30,
        moralityLevel: morality ?? 50,
        hopeLevel: hope ?? 60,
        isolationLevel: isolation ?? 20,
        transformationProgress: transformation ?? 0,
        mbti,
        voiceSignature,
      })
      .returning()

    // Create game entity for cross-domain visibility
    let entityId: string | null = null
    try {
      const entityResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: session.user.id,
          entityType: 'character',
          name,
          description: description || characterPrompt,
          sourceDomain: 'storyteller',
          sourceEntityId: newCharacter.id,
          metadata: {
            role,
            gender,
            mbti,
            voiceSignature,
            metrics: { stress, trust, power, morality, hope, isolation, transformation },
          },
          imageUrl: portraitUrl,
          tags: [role || 'Supporting', gender].filter(Boolean),
        }),
      })
      
      if (entityResponse.ok) {
        const { entity } = await entityResponse.json()
        entityId = entity?.id
      }
    } catch (error) {
      console.error('[Character API] Failed to create game entity:', error)
      // Don't fail the character creation if entity creation fails
    }

    // Generate cross-domain suggestions
    const suggestions = [
      {
        id: `char-to-mechanics-${newCharacter.id}`,
        type: 'cross_domain',
        title: `Design mechanics for ${name}`,
        description: 'Create gameplay systems and abilities for this character',
        targetDomain: 'loop-creator',
        targetRoute: `/app/${projectId}/loop-creator`,
        autoMessage: `Design combat and movement mechanics for @${name}. Consider their role${role ? ` as ${role}` : ''}.`,
        priority: 5,
        entityId: entityId || newCharacter.id,
      },
      {
        id: `char-to-home-${newCharacter.id}`,
        type: 'cross_domain',
        title: `Build ${name}'s home`,
        description: "Design the character's living space in 3D",
        targetDomain: 'interior-designer',
        targetRoute: `/app/${projectId}/interior-design`,
        priority: 3,
        entityId: entityId || newCharacter.id,
      },
    ]

    return NextResponse.json({
      ...newCharacter,
      _suggestions: suggestions,
    })
  } catch (error) {
    console.error('Failed to create character:', error)
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      hope,
      isolation,
      transformation,
      mbti,
      voiceSignature,
      psychology,
      description,
      portraitUrl,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    if (!(await verifyCharacterAccess(id, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object with only valid fields
    const dbUpdates: Record<string, any> = {}

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
    if (stress !== undefined) dbUpdates.stressLevel = stress
    if (trust !== undefined) dbUpdates.trustLevel = trust
    if (power !== undefined) dbUpdates.powerLevel = power
    if (morality !== undefined) dbUpdates.moralityLevel = morality
    if (hope !== undefined) dbUpdates.hopeLevel = hope
    if (isolation !== undefined) dbUpdates.isolationLevel = isolation
    if (transformation !== undefined) dbUpdates.transformationProgress = transformation

    const [updatedCharacter] = await db
      .update(characters)
      .set({ ...dbUpdates, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning()

    return NextResponse.json(updatedCharacter)
  } catch (error) {
    console.error('Failed to update character:', error)
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await verifyCharacterAccess(id, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get character to find associated entity
    const [character] = await db.select().from(characters).where(eq(characters.id, id))

    await db.delete(characters).where(eq(characters.id, id))

    // Delete associated game entity
    if (character) {
      try {
        const entitiesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/entities?projectId=${character.projectId}&sourceDomain=storyteller`
        )
        const { entities } = await entitiesResponse.json()
        const entity = entities?.find((e: any) => e.source_entity_id === id)
        
        if (entity) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/entities/${entity.id}`,
            { method: 'DELETE' }
          )
        }
      } catch (error) {
        console.error('[Character API] Failed to delete game entity:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete character:', error)
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
  }
}
