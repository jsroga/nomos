import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects, seriesBibles, storyPlans } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { firstNonEmptyRecord, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { StorytellerLegacyPlanField } from '@/domains/storyteller/core/storyteller-page-wire'

const LEGACY_STORY_PLAN_FIELDS = [
  StorytellerLegacyPlanField.WorldDescription,
  StorytellerLegacyPlanField.Genre,
  StorytellerLegacyPlanField.Tone,
  StorytellerLegacyPlanField.WorldRules,
  StorytellerLegacyPlanField.Factions,
  StorytellerLegacyPlanField.KeyCharacters,
  StorytellerLegacyPlanField.PlotTwists,
  StorytellerLegacyPlanField.Inspirations,
] as const

function withoutOverlappingLegacyFields(
  target: Record<string, unknown>,
  storyPlan: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(target).filter(([key]) => {
      const isLegacyField = LEGACY_STORY_PLAN_FIELDS.some(field => field === key)
      return !(isLegacyField && storyPlan[key] && target[key])
    })
  )
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    // Verify project access
    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        seriesBibleTable: true,
        storyPlanTable: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    const seriesBible = firstNonEmptyRecord(
      project.seriesBibleTable?.content,
      project.seriesBible
    )
    const storyPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)

    // CLEANUP: Remove legacy fields from seriesBible if they exist in storyPlan
    // This prevents the frontend from merging stale data and ensures single source of truth
    if (Object.keys(storyPlan).length > 0) {
      const cleanedSeriesBible = withoutOverlappingLegacyFields(seriesBible, storyPlan)
      const setting = recordFromJson(cleanedSeriesBible.Setting)

      const seriesBibleClean =
        Object.keys(setting).length > 0
          ? {
              ...cleanedSeriesBible,
              Setting: withoutOverlappingLegacyFields(setting, storyPlan),
            }
          : cleanedSeriesBible

      return NextResponse.json({
        ...project,
        seriesBible: seriesBibleClean,
        storyPlan,
        seriesBibleTable: undefined,
        storyPlanTable: undefined,
      })
    }

    return NextResponse.json({
      ...project,
      seriesBible,
      storyPlan,
      seriesBibleTable: undefined,
      storyPlanTable: undefined,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.PROJECT_FETCH_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_PROJECT }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    // Verify project access
    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const body = await req.json()
    const { series_bible, seriesBible, story_plan, storyPlan, ...updates } = body

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
      const existingContent = firstNonEmptyRecord(
        projectForMerge.seriesBible,
        projectForMerge.seriesBibleTable?.content
      )
      const mergedContent = { ...existingContent, ...recordFromJson(bibleUpdate) }

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
      const existingContent = firstNonEmptyRecord(
        projectForMerge.storyPlan,
        projectForMerge.storyPlanTable?.content
      )
      const mergedContent = { ...existingContent, ...recordFromJson(planUpdate) }

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
    console.error(API_LOG_PREFIX.PROJECT_UPDATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_PROJECT }, { status: 500 })
  }
}
