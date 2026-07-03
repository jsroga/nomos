import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, seriesBibles, storyPlans } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

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

    const seriesBible = (project.seriesBibleTable?.content ||
      project.seriesBible ||
      {}) as Record<string, unknown>
    const storyPlan = (project.storyPlanTable?.content || project.storyPlan || {}) as Record<
      string,
      unknown
    >

    // CLEANUP: Remove legacy fields from seriesBible if they exist in storyPlan
    // This prevents the frontend from merging stale data and ensures single source of truth
    if (Object.keys(storyPlan).length > 0) {
      const legacyFields = [
        'worldDescription',
        'genre',
        'tone',
        'worldRules',
        'factions',
        'keyCharacters',
        'plotTwists',
        'inspirations',
      ]

      // 1. Clean from Top Level
      for (const field of legacyFields) {
        if (storyPlan[field] && seriesBible[field]) {
          delete seriesBible[field]
        }
      }

      // 2. Clean from 'Setting' category (common legacy location)
      const setting = seriesBible['Setting'] as Record<string, unknown> | undefined
      if (setting) {
        for (const field of legacyFields) {
          if (storyPlan[field] && setting[field]) {
            delete setting[field]
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
    if (updates.style_preset !== undefined) dbUpdates.stylePreset = updates.style_preset
    if (updates.stylePreset !== undefined) dbUpdates.stylePreset = updates.stylePreset
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.master_prompt !== undefined) dbUpdates.masterPrompt = updates.master_prompt
    if (updates.masterPrompt !== undefined) dbUpdates.masterPrompt = updates.masterPrompt

    if (Object.keys(dbUpdates).length > 1) {
      await db.update(projects).set(dbUpdates).where(eq(projects.id, params.id))
    }

    const bibleUpdate = series_bible ?? seriesBible
    const planUpdate = story_plan ?? storyPlan

    // Fetch project once for both bible and plan merge (need full content to avoid wiping on partial updates)
    const projectForMerge =
      bibleUpdate !== undefined || planUpdate !== undefined
        ? await db.query.projects.findFirst({
            where: eq(projects.id, params.id),
            with: { seriesBibleTable: true, storyPlanTable: true },
          })
        : null

    // 2. Update Series Bible (Upsert with Merge)
    if (bibleUpdate !== undefined && projectForMerge) {
      const fromTable = (projectForMerge.seriesBibleTable?.content || {}) as Record<string, unknown>
      const fromProject = (projectForMerge.seriesBible || {}) as Record<string, unknown>
      const existingContent =
        Object.keys(fromProject).length > Object.keys(fromTable).length ? fromProject : fromTable
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
    if (planUpdate !== undefined && projectForMerge) {
      const planFromTable = (projectForMerge.storyPlanTable?.content ||
        {}) as Record<string, unknown>
      const planFromProject = (projectForMerge.storyPlan || {}) as Record<string, unknown>
      const existingContent =
        Object.keys(planFromProject).length > Object.keys(planFromTable).length
          ? planFromProject
          : planFromTable
      const mergedContent = { ...existingContent, ...(planUpdate as Record<string, unknown>) }

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
