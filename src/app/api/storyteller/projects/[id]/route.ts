import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, seriesBibles, storyPlans } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller/lib/access-verification'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify project access
    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

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

    const seriesBible = project.seriesBibleTable?.content || project.seriesBible || {}
    const storyPlan = project.storyPlanTable?.content || project.storyPlan || {}

    // CLEANUP: Remove legacy fields from seriesBible if they exist in storyPlan
    // This prevents the frontend from merging stale data and ensures single source of truth
    if (Object.keys(storyPlan).length > 0) {
      const legacyFields = [
        'worldDescription', 'genre', 'tone', 'worldRules',
        'factions', 'keyCharacters', 'plotTwists', 'inspirations'
      ]

      // 1. Clean from Top Level
      for (const field of legacyFields) {
        if ((storyPlan as any)[field] && (seriesBible as any)[field]) {
          delete (seriesBible as any)[field]
        }
      }

      // 2. Clean from 'Setting' category (common legacy location)
      if ((seriesBible as any).Setting) {
        for (const field of legacyFields) {
          if ((storyPlan as any)[field] && (seriesBible as any).Setting[field]) {
            delete (seriesBible as any).Setting[field]
          }
        }
      }
    }

    return NextResponse.json({
      ...project,
      seriesBible,
      storyPlan,
      seriesBibleTable: undefined,
      storyPlanTable: undefined,
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify project access
    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const body = await req.json()
    const { id, series_bible, seriesBible, story_plan, storyPlan, ...updates } = body

    // 1. Update Project Table
    const dbUpdates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() }

    if (updates.style_reference_urls !== undefined)
      dbUpdates.styleReferenceUrls = updates.style_reference_urls
    if (updates.styleReferenceUrls !== undefined)
      dbUpdates.styleReferenceUrls = updates.styleReferenceUrls
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.master_prompt !== undefined) dbUpdates.masterPrompt = updates.master_prompt
    if (updates.masterPrompt !== undefined) dbUpdates.masterPrompt = updates.masterPrompt

    if (Object.keys(dbUpdates).length > 1) {
      await db.update(projects).set(dbUpdates).where(eq(projects.id, params.id))
    }

    // 2. Update Series Bible (Upsert with Merge)
    const bibleUpdate = series_bible ?? seriesBible
    if (bibleUpdate !== undefined) {
      // Fetch existing content first to merge
      const existing = await db.query.seriesBibles.findFirst({
        where: eq(seriesBibles.projectId, params.id),
      })
      const existingContent = (existing?.content || {}) as Record<string, any>
      const mergedContent = { ...existingContent, ...bibleUpdate }

      await db
        .insert(seriesBibles)
        .values({ projectId: params.id, content: mergedContent })
        .onConflictDoUpdate({
          target: seriesBibles.projectId,
          set: { content: mergedContent, updatedAt: new Date() },
        })
    }

    // 3. Update Story Plan (Upsert with Merge)
    const planUpdate = story_plan ?? storyPlan
    if (planUpdate !== undefined) {
      // Fetch existing content first to merge
      const existing = await db.query.storyPlans.findFirst({
        where: eq(storyPlans.projectId, params.id),
      })
      const existingContent = (existing?.content || {}) as Record<string, any>
      const mergedContent = { ...existingContent, ...(planUpdate as Record<string, any>) }

      await db
        .insert(storyPlans)
        .values({ projectId: params.id, content: mergedContent })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: mergedContent, updatedAt: new Date() },
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
