import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { interiorDesigns } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const designId = searchParams.get('designId')

  if (!projectId && !designId) {
    return NextResponse.json({ error: 'Project ID or Design ID is required' }, { status: 400 })
  }

  try {
    if (designId) {
      // Fetch single design
      const [design] = await db
        .select()
        .from(interiorDesigns)
        .where(eq(interiorDesigns.id, designId))
      return NextResponse.json(design || null)
    } else {
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
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const {
      data: { session },
    } = await supabase.auth.getSession()

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
    const body = await req.json()
    const { id, name, sceneData } = body

    if (!id) {
      return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })
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
    await db.delete(interiorDesigns).where(eq(interiorDesigns.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete interior design:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
