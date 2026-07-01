import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { gameLoops } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, checkRateLimit } from '@/lib/api-utils'
import {
  verifyProjectAccess,
  verifyGameLoopAccess,
} from '@/domains/storyteller'

/**
 * GET - Fetch game loops
 * Query params:
 *   - projectId: Fetch all loops for a project
 *   - loopId: Fetch a specific loop
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const loopId = searchParams.get('loopId')

  if (!projectId && !loopId) {
    return NextResponse.json({ error: 'Project ID or Loop ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (loopId) {
      // Single JOIN query for access check
      const { hasAccess } = await verifyGameLoopAccess(loopId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Fetch single loop
      const [loop] = await db.select().from(gameLoops).where(eq(gameLoops.id, loopId))
      return NextResponse.json(loop || null)
    } else {
      // Check project access
      if (!(await verifyProjectAccess(projectId!, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Fetch all loops for project
      const loops = await db
        .select()
        .from(gameLoops)
        .where(eq(gameLoops.projectId, projectId!))
        .orderBy(desc(gameLoops.updatedAt))
      return NextResponse.json(loops)
    }
  } catch (error) {
    console.error('Failed to fetch game loops:', error)
    return NextResponse.json({ error: 'Failed to fetch loops' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 loop creations per minute
    const { allowed } = checkRateLimit(`loop-create:${session.user.id}`, {
      maxRequests: 10,
      windowMs: 60000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before creating more loops.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { projectId, name, nodes, edges, metadata, analysis } = body

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/entities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            userId: session.user.id,
            entityType: 'mechanic',
            name,
            description: metadata?.description || `Game loop: ${name}`,
            sourceDomain: 'loop-creator',
            sourceEntityId: newLoop.id,
            metadata: {
              loopType: metadata?.type,
              ...metadata,
            },
            tags: [metadata?.type || 'game-loop'].filter(Boolean),
          }),
        }
      )

      if (entityResponse.ok) {
        const { entity } = await entityResponse.json()
        entityId = entity?.id
      }
    } catch (error) {
      console.error('[Loop API] Failed to create game entity:', error)
    }

    // Generate cross-domain suggestions
    const suggestions = [
      {
        id: `loop-to-story-${newLoop.id}`,
        type: 'cross_domain',
        title: `Write a story featuring ${name}`,
        description: 'Create narrative scenarios that showcase this mechanic',
        targetDomain: 'storyteller',
        targetRoute: `/app/${projectId}/storyteller`,
        autoMessage: `Write a scene that demonstrates the @${name} mechanic in action. Make it feel exciting and impactful.`,
        priority: 5,
        entityId: entityId || newLoop.id,
      },
      {
        id: `loop-to-level-${newLoop.id}`,
        type: 'cross_domain',
        title: `Design a level for ${name}`,
        description: 'Create environments that leverage this mechanic',
        targetDomain: 'interior-designer',
        targetRoute: `/app/${projectId}/interior-design`,
        priority: 4,
        entityId: entityId || newLoop.id,
      },
    ]

    return NextResponse.json({
      ...newLoop,
      _suggestions: suggestions,
    })
  } catch (error) {
    console.error('Failed to create game loop:', error)
    return NextResponse.json({ error: 'Failed to create loop' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, nodes, edges, metadata, analysis } = body

    if (!id) {
      return NextResponse.json({ error: 'Loop ID is required' }, { status: 400 })
    }

    // Single JOIN query for access check
    const { hasAccess } = await verifyGameLoopAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    console.error('Failed to update game loop:', error)
    return NextResponse.json({ error: 'Failed to update loop' }, { status: 500 })
  }
}

/**
 * DELETE - Delete a game loop
 * Query params: id
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Loop ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single JOIN query for access check
    const { hasAccess } = await verifyGameLoopAccess(id, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.delete(gameLoops).where(eq(gameLoops.id, id))
    console.log(`✅ Game loop deleted: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete game loop:', error)
    return NextResponse.json({ error: 'Failed to delete loop' }, { status: 500 })
  }
}
