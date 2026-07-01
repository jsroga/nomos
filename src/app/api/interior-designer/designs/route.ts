import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interiorDesigns, projects } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAuth, checkRateLimit } from '@/lib/api-utils'
import { verifyProjectAccess } from '@/domains/storyteller'
import {
  createInteriorDesignRequestSchema,
  interiorDesignSummaryListSchema,
  toInteriorDesignDetail,
  toInteriorDesignSummary,
  updateInteriorDesignRequestSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'

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
  const projectId = searchParams.get('projectId')
  const designId = searchParams.get('designId')

  if (!projectId && !designId) {
    return NextResponse.json({ error: 'Project ID or Design ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (designId) {
      const { hasAccess } = await verifyDesignAccess(designId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const [design] = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.id, designId))

      return NextResponse.json(design ? toInteriorDesignDetail(design) : null)
    } else {
      if (!(await verifyProjectAccess(projectId!, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const designs = await db
        .select({
          id: interiorDesigns.id,
          name: interiorDesigns.name,
          updatedAt: interiorDesigns.updatedAt,
        })
        .from(interiorDesigns)
        .where(eq(interiorDesigns.projectId, projectId!))
        .orderBy(desc(interiorDesigns.updatedAt))

      return NextResponse.json(
        interiorDesignSummaryListSchema.parse(designs.map(design => toInteriorDesignSummary(design)))
      )
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
      return NextResponse.json({ error: 'Invalid design payload' }, { status: 400 })
    }

    const { projectId, name, sceneData } = parsedBody.data

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [newDesign] = await db
      .insert(interiorDesigns)
      .values({ projectId, userId: session.user.id, name, sceneData })
      .returning({
        id: interiorDesigns.id,
        name: interiorDesigns.name,
        updatedAt: interiorDesigns.updatedAt,
      })

    return NextResponse.json(toInteriorDesignSummary(newDesign))
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
      return NextResponse.json({ error: 'Invalid design update payload' }, { status: 400 })
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
      .returning({
        id: interiorDesigns.id,
        name: interiorDesigns.name,
        updatedAt: interiorDesigns.updatedAt,
      })

    return NextResponse.json(toInteriorDesignSummary(updatedDesign))
  } catch (error) {
    console.error('Failed to update interior design:', error)
    return NextResponse.json({ error: 'Failed to update design' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { hasAccess } = await verifyDesignAccess(id, session.user.id)
    if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    await db.delete(interiorDesigns).where(eq(interiorDesigns.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete interior design:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
