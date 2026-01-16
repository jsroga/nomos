import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, seriesBibles, storyPlans } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        seriesBibleTable: true,
        storyPlanTable: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...project,
      // Map content from relation if available, otherwise fallback to old column (during migration)
      seriesBible: project.seriesBibleTable?.content || project.seriesBible || {},
      storyPlan: project.storyPlanTable?.content || project.storyPlan || {},
      // Clean up relation properties
      seriesBibleTable: undefined,
      storyPlanTable: undefined,
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const body = await req.json()
    console.log('📦 Project PATCH body:', body)

    // Remove id from body if present
    const { id, series_bible, seriesBible, story_plan, storyPlan, ...updates } = body

    // 1. Update Project Table
    const dbUpdates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (updates.style_reference_urls !== undefined)
      dbUpdates.styleReferenceUrls = updates.style_reference_urls
    if (updates.styleReferenceUrls !== undefined)
      dbUpdates.styleReferenceUrls = updates.styleReferenceUrls
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.master_prompt !== undefined) dbUpdates.masterPrompt = updates.master_prompt
    if (updates.masterPrompt !== undefined) dbUpdates.masterPrompt = updates.masterPrompt

    if (Object.keys(dbUpdates).length > 1) {
      // more than just updatedAt
      await db.update(projects).set(dbUpdates).where(eq(projects.id, params.id))
    }

    // 2. Update Series Bible (Upsert)
    const bibleContent = series_bible ?? seriesBible
    if (bibleContent !== undefined) {
      await db
        .insert(seriesBibles)
        .values({ projectId: params.id, content: bibleContent })
        .onConflictDoUpdate({
          target: seriesBibles.projectId,
          set: { content: bibleContent, updatedAt: new Date() },
        })
    }

    // 3. Update Story Plan (Upsert)
    const planContent = story_plan ?? storyPlan
    if (planContent !== undefined) {
      await db
        .insert(storyPlans)
        .values({ projectId: params.id, content: planContent })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: planContent, updatedAt: new Date() },
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
