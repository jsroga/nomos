import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const project = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1)

    if (!project || project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project[0])
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json()
    console.log('📦 Project PATCH body:', body)

    // Remove id from body if present to avoid updating primary key
    const { id, ...updates } = body

    // Prepare strictly typed updates object
    const dbUpdates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    }

    // Explicitly map allowed fields
    if (updates.style_reference_urls !== undefined) dbUpdates.styleReferenceUrls = updates.style_reference_urls
    if (updates.styleReferenceUrls !== undefined) dbUpdates.styleReferenceUrls = updates.styleReferenceUrls

    if (updates.series_bible !== undefined) dbUpdates.seriesBible = updates.series_bible
    if (updates.seriesBible !== undefined) dbUpdates.seriesBible = updates.seriesBible

    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.story_plan !== undefined) dbUpdates.storyPlan = updates.story_plan
    if (updates.storyPlan !== undefined) dbUpdates.storyPlan = updates.storyPlan

    console.log('💾 Project DB Updates:', dbUpdates)

    // Ensure we have something to update (at least updatedAt should be there)
    if (Object.keys(dbUpdates).length === 0) {
      console.warn('⚠️ No valid updates found for project')
      return NextResponse.json({ success: true, message: 'No updates applied' })
    }

    await db
      .update(projects)
      .set(dbUpdates)
      .where(eq(projects.id, params.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
