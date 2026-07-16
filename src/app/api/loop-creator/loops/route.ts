import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { gameLoops } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, checkRateLimit } from '@/shared/data/api-utils'
import { verifyGameLoopAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ApiRoutePath,
  AppModuleId,
  ContentType,
  CrossDomainSuggestionCopy,
  CrossDomainSuggestionType,
  GameEntityKind,
  GameEntityTag,
  HttpMethod,
  HttpStatus,
  QueryParam,
} from '@/shared/data/constants/protocol'
import { DEFAULT_BASE_URL } from '@/shared/data/constants/url'

/**
 * GET - Fetch game loops
 * Query params:
 *   - projectId: Fetch all loops for a project
 *   - loopId: Fetch a specific loop
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get(QueryParam.ProjectId)
  const loopId = searchParams.get(QueryParam.LoopId)

  if (!projectId && !loopId) {
    return NextResponse.json({ error: API_ERROR.LOOP_PROJECT_OR_LOOP_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    if (loopId) {
      // Single JOIN query for access check
      const { hasAccess } = await verifyGameLoopAccess(loopId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
      }

      // Fetch single loop
      const [loop] = await db.select().from(gameLoops).where(eq(gameLoops.id, loopId))
      return NextResponse.json(loop || null)
    } else {
      if (!projectId) {
        return NextResponse.json(
          { error: API_ERROR.LOOP_PROJECT_OR_LOOP_ID_REQUIRED },
          { status: HttpStatus.BAD_REQUEST },
        )
      }
      if (!(await verifyProjectAccess(projectId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
      }

      const loops = await db
        .select()
        .from(gameLoops)
        .where(eq(gameLoops.projectId, projectId))
        .orderBy(desc(gameLoops.updatedAt))
      return NextResponse.json(loops)
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_FETCH_GAME_LOOPS, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_LOOPS }, { status: HttpStatus.INTERNAL })
  }
}

/**
 * POST - Create a new game loop
 * Body: { projectId, name, nodes?, edges?, metadata?, analysis? }
 */
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    // Rate limit: 10 loop creations per minute
    const { allowed } = checkRateLimit(`loop-create:${session.user.id}`, {
      maxRequests: 10,
      windowMs: 60000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: API_ERROR.LOOP_CREATE_RATE_LIMIT },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { projectId, name, nodes, edges, metadata, analysis } = body

    if (!projectId || !name) {
      return NextResponse.json({ error: API_ERROR.LOOP_PROJECT_AND_NAME_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const [newLoop] = await db
      .insert(gameLoops)
      .values({
        projectId,
        userId: session.user.id,
        name,
        nodes: nodes || [],
        edges: edges || [],
        metadata: metadata || null,
        analysis: analysis || null,
      })
      .returning()

    console.log(`✅ Game loop created: ${name} (${newLoop.id})`)

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
            entityType: GameEntityKind.Mechanic,
            name,
            description: metadata?.description || `Game loop: ${name}`,
            sourceDomain: AppModuleId.LoopCreator,
            sourceEntityId: newLoop.id,
            metadata: {
              loopType: metadata?.type,
              ...metadata,
            },
            tags: [metadata?.type || GameEntityTag.GameLoop].filter(Boolean),
          }),
        }
      )

      if (entityResponse.ok) {
        const { entity } = await entityResponse.json()
        entityId = entity?.id
      }
    } catch (error) {
      console.error(API_LOG_PREFIX.LOOP_ENTITY_CREATE_FAILED, error)
    }

    // Generate cross-domain suggestions
    const suggestions = [
      {
        id: `loop-to-story-${newLoop.id}`,
        type: CrossDomainSuggestionType.CrossDomain,
        title: `Write a story featuring ${name}`,
        description: CrossDomainSuggestionCopy.LoopToStoryDescription,
        targetDomain: AppModuleId.Storyteller,
        targetRoute: `/${projectId}/storyteller`,
        autoMessage: `Write a scene that demonstrates the @${name} mechanic in action. Make it feel exciting and impactful.`,
        priority: 5,
        entityId: entityId || newLoop.id,
      },
      {
        id: `loop-to-level-${newLoop.id}`,
        type: CrossDomainSuggestionType.CrossDomain,
        title: `Design a level for ${name}`,
        description: CrossDomainSuggestionCopy.LoopToLevelDescription,
        targetDomain: AppModuleId.InteriorDesigner,
        targetRoute: `/${projectId}/interior-design`,
        priority: 4,
        entityId: entityId || newLoop.id,
      },
    ]

    return NextResponse.json({
      ...newLoop,
      _suggestions: suggestions,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_CREATE_GAME_LOOP, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_LOOP }, { status: HttpStatus.INTERNAL })
  }
}

/**
 * PATCH - Update an existing game loop
 * Body: { id, name?, nodes?, edges?, metadata?, analysis? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const body = await req.json()
    const { id, name, nodes, edges, metadata, analysis } = body

    if (!id) {
      return NextResponse.json({ error: API_ERROR.LOOP_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    // Single JOIN query for access check
    const { hasAccess } = await verifyGameLoopAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name
    if (nodes !== undefined) updates.nodes = nodes
    if (edges !== undefined) updates.edges = edges
    if (metadata !== undefined) updates.metadata = metadata
    if (analysis !== undefined) updates.analysis = analysis

    const [updatedLoop] = await db
      .update(gameLoops)
      .set(updates)
      .where(eq(gameLoops.id, id))
      .returning()

    console.log(`✅ Game loop updated: ${updatedLoop.name} (${id})`)
    return NextResponse.json(updatedLoop)
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_UPDATE_GAME_LOOP, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_LOOP }, { status: HttpStatus.INTERNAL })
  }
}

/**
 * DELETE - Delete a game loop
 * Query params: id
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get(QueryParam.Id)

  if (!id) {
    return NextResponse.json({ error: API_ERROR.LOOP_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    // Single JOIN query for access check
    const { hasAccess } = await verifyGameLoopAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.FORBIDDEN })
    }

    await db.delete(gameLoops).where(eq(gameLoops.id, id))
    console.log(`✅ Game loop deleted: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.FAILED_DELETE_GAME_LOOP, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_LOOP }, { status: HttpStatus.INTERNAL })
  }
}
