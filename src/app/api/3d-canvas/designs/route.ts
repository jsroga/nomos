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
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { FormField, QueryParam } from '@/shared/data/constants/protocol'

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
    projectId: searchParams.get(FormField.ProjectId) ?? undefined,
    designId: searchParams.get(FormField.DesignId) ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { projectId, designId } = parsedQuery.data

    if (designId) {
      const { hasAccess } = await verifyDesignAccess(designId, session.user.id)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const [design] = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.id, designId))

      return NextResponse.json(interiorDesignResponseSchema.parse(design || null))
    } else {
      if (!projectId) {
        return NextResponse.json({ error: API_ERROR.MISSING_PROJECT_ID }, { status: 403 })
      }
      if (!(await verifyProjectAccess(projectId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const designs = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.projectId, projectId))
        .orderBy(desc(interiorDesigns.updatedAt))

      return NextResponse.json(interiorDesignListResponseSchema.parse(designs))
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.INTERIOR_DESIGNS_FETCH_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_DESIGNS }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { allowed } = checkRateLimit(`design-create:${session.user.id}`, {
      maxRequests: 20,
      windowMs: 60000,
    })
    if (!allowed) return NextResponse.json({ error: API_ERROR.RATE_LIMIT_EXCEEDED }, { status: 429 })

    const parsedBody = createInteriorDesignRequestSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
    }

    const { projectId, name, sceneData } = parsedBody.data

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const [newDesign] = await db
      .insert(interiorDesigns)
      .values({ projectId, userId: session.user.id, name, sceneData })
      .returning()

    return NextResponse.json(interiorDesignResponseSchema.parse(newDesign))
  } catch (error) {
    console.error(API_LOG_PREFIX.INTERIOR_DESIGNS_CREATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_CREATE_DESIGN }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const parsedBody = updateInteriorDesignRequestSchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
    }

    const { id, name, sceneData } = parsedBody.data

    const { hasAccess } = await verifyDesignAccess(id, session.user.id)
    if (!hasAccess) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })

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
    console.error(API_LOG_PREFIX.INTERIOR_DESIGNS_UPDATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_DESIGN }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsedQuery = deleteInteriorDesignQuerySchema.safeParse({
    id: searchParams.get(QueryParam.Id) ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { id } = parsedQuery.data

    const { hasAccess } = await verifyDesignAccess(id, session.user.id)
    if (!hasAccess) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })

    await db.delete(interiorDesigns).where(eq(interiorDesigns.id, id))
    return NextResponse.json(deleteInteriorDesignResponseSchema.parse({ success: true }))
  } catch (error) {
    console.error(API_LOG_PREFIX.INTERIOR_DESIGNS_DELETE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_DESIGN }, { status: 500 })
  }
}
