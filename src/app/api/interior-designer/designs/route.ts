import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { interiorDesigns, projects } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, checkRateLimit } from '@/shared/data/api-utils'
import {
  createInteriorDesignRequestSchema,
  deleteInteriorDesignQuerySchema,
  deleteInteriorDesignResponseSchema,
  interiorDesignListResponseSchema,
  interiorDesignLookupQuerySchema,
  interiorDesignResponseSchema,
  updateInteriorDesignRequestSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'
import { verifyProjectAccess } from '@/domains/storyteller/server'

/**
 * Verify design access using single JOIN query
 */
async function verifyDesignAccess(
  designId: string,
  userId: string
): Promise<{
  hasAccess: boolean
  projectId?: string
}> {
  const result = await db
    .select({
      designId: interiorDesigns.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(interiorDesigns)
    .innerJoin(projects, eq(interiorDesigns.projectId, projects.id))
    .where(eq(interiorDesigns.id, designId))
    .limit(1)

  if (result.length === 0) return { hasAccess: false }

  const row = result[0]
  if (row.projectUserId !== userId) return { hasAccess: false }

  return { hasAccess: true, projectId: row.projectId }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsedQuery = interiorDesignLookupQuerySchema.safeParse({
    projectId: searchParams.get('projectId') ?? undefined,
    designId: searchParams.get('designId') ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId, designId } = parsedQuery.data

    if (designId) {
      const { hasAccess } = await verifyDesignAccess(designId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const [design] = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.id, designId))

      return NextResponse.json(interiorDesignResponseSchema.parse(design || null))
    } else {
      if (!(await verifyProjectAccess(projectId!, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const designs = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.projectId, projectId!))
        .orderBy(desc(interiorDesigns.updatedAt))

      return NextResponse.json(interiorDesignListResponseSchema.parse(designs))
    }
  } catch (error) {
    console.error('Failed to fetch interior designs:', error)
    return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = checkRateLimit(`design-create:${session.user.id}`, {
      maxRequests: 20,
      windowMs: 60000,
    })
    if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

    const parsedBody = createInteriorDesignRequestSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
    }

    const { projectId, name, sceneData } = parsedBody.data

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [newDesign] = await db
      .insert(interiorDesigns)
      .values({ projectId, userId: session.user.id, name, sceneData })
      .returning()

    return NextResponse.json(interiorDesignResponseSchema.parse(newDesign))
  } catch (error) {
    console.error('Failed to create interior design:', error)
    return NextResponse.json({ error: 'Failed to create design' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedBody = updateInteriorDesignRequestSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
    }

    const { id, name, sceneData } = parsedBody.data

    const { hasAccess } = await verifyDesignAccess(id, session.user.id)
    if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name
    if (sceneData !== undefined) updates.sceneData = sceneData

    const [updatedDesign] = await db
      .update(interiorDesigns)
      .set(updates)
      .where(eq(interiorDesigns.id, id))
      .returning()

    return NextResponse.json(interiorDesignResponseSchema.parse(updatedDesign))
  } catch (error) {
    console.error('Failed to update interior design:', error)
    return NextResponse.json({ error: 'Failed to update design' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsedQuery = deleteInteriorDesignQuerySchema.safeParse({
    id: searchParams.get('id') ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = parsedQuery.data

    const { hasAccess } = await verifyDesignAccess(id, session.user.id)
    if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    await db.delete(interiorDesigns).where(eq(interiorDesigns.id, id))
    return NextResponse.json(deleteInteriorDesignResponseSchema.parse({ success: true }))
  } catch (error) {
    console.error('Failed to delete interior design:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
