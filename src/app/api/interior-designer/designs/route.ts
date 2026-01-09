import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interiorDesigns, projects } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

async function verifyProjectAccess(projectId: string, userId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project || project.userId !== userId) {
    return false
  }
  return true
}

async function verifyDesignAccess(designId: string, userId: string) {
  const [design] = await db.select().from(interiorDesigns).where(eq(interiorDesigns.id, designId))
  if (!design) return false
  return verifyProjectAccess(design.projectId, userId)
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
      // Check access
      if (!(await verifyDesignAccess(designId, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Fetch single design
      const [design] = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.id, designId))
      return NextResponse.json(design || null)
    } else {
      // Check access
      if (!(await verifyProjectAccess(projectId!, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Fetch all designs for project
      const designs = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.projectId, projectId!))
        .orderBy(desc(interiorDesigns.updatedAt))
      return NextResponse.json(designs)
    }
  } catch (error) {
    console.error('Failed to fetch interior designs:', error)
    return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { projectId, name, sceneData } = body

    if (!projectId || !name || !sceneData) {
      return NextResponse.json(
        { error: 'Project ID, name, and scene data are required' },
        { status: 400 }
      )
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [newDesign] = await db
      .insert(interiorDesigns)
      .values({
        projectId,
        userId: session.user.id,
        name,
        sceneData,
      })
      .returning()

    return NextResponse.json(newDesign)
  } catch (error) {
    console.error('Failed to create interior design:', error)
    return NextResponse.json({ error: 'Failed to create design' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, sceneData } = body

    if (!id) {
      return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })
    }

    if (!(await verifyDesignAccess(id, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updates: any = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name
    if (sceneData !== undefined) updates.sceneData = sceneData

    const [updatedDesign] = await db
      .update(interiorDesigns)
      .set(updates)
      .where(eq(interiorDesigns.id, id))
      .returning()

    return NextResponse.json(updatedDesign)
  } catch (error) {
    console.error('Failed to update interior design:', error)
    return NextResponse.json({ error: 'Failed to update design' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })
  }

  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await verifyDesignAccess(id, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.delete(interiorDesigns).where(eq(interiorDesigns.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete interior design:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
