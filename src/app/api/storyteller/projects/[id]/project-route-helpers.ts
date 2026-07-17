import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects, seriesBibles, storyPlans } from '@/db'
import { eq } from 'drizzle-orm'
import { firstNonEmptyRecord, readString, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'
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

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  return readString(value)
}

function buildProjectDbUpdates(body: Record<string, unknown>) {
  const dbUpdates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() }

  if (body.style_reference_urls !== undefined)
    dbUpdates.styleReferenceUrls = body.style_reference_urls
  if (body.styleReferenceUrls !== undefined) dbUpdates.styleReferenceUrls = body.styleReferenceUrls
  if (body.style_preset !== undefined) dbUpdates.stylePreset = readNullableString(body.style_preset)
  if (body.stylePreset !== undefined) dbUpdates.stylePreset = readNullableString(body.stylePreset)
  if (body.name !== undefined) {
    const name = readString(body.name)
    if (name !== undefined) dbUpdates.name = name
  }
  if (body.description !== undefined)
    dbUpdates.description = readNullableString(body.description)
  if (body.master_prompt !== undefined)
    dbUpdates.masterPrompt = readNullableString(body.master_prompt)
  if (body.masterPrompt !== undefined) dbUpdates.masterPrompt = readNullableString(body.masterPrompt)

  return dbUpdates
}

async function upsertMergedJsonContent(input: {
  projectId: string
  bibleUpdate: unknown
  planUpdate: unknown
  projectForMerge: {
    seriesBible: unknown
    storyPlan: unknown
    seriesBibleTable?: { content: unknown } | null
    storyPlanTable?: { content: unknown } | null
  }
}) {
  if (input.bibleUpdate !== undefined) {
    const existingContent = firstNonEmptyRecord(
      input.projectForMerge.seriesBible,
      input.projectForMerge.seriesBibleTable?.content
    )
    const mergedContent = { ...existingContent, ...recordFromJson(input.bibleUpdate) }

    await db
      .insert(seriesBibles)
      .values({ projectId: input.projectId, content: mergedContent })
      .onConflictDoUpdate({
        target: seriesBibles.projectId,
        set: { content: mergedContent, updatedAt: new Date() },
      })
  }

  if (input.planUpdate !== undefined) {
    const existingContent = firstNonEmptyRecord(
      input.projectForMerge.storyPlan,
      input.projectForMerge.storyPlanTable?.content
    )
    const mergedContent = { ...existingContent, ...recordFromJson(input.planUpdate) }

    await db
      .insert(storyPlans)
      .values({ projectId: input.projectId, content: mergedContent })
      .onConflictDoUpdate({
        target: storyPlans.projectId,
        set: { content: mergedContent, updatedAt: new Date() },
      })
  }
}

export async function patchStorytellerProject(projectId: string, req: NextRequest) {
  const body = await req.json()
  const { series_bible, seriesBible, story_plan, storyPlan, ...updates } = body

  const dbUpdates = buildProjectDbUpdates(updates)
  if (Object.keys(dbUpdates).length > 1) {
    await db.update(projects).set(dbUpdates).where(eq(projects.id, projectId))
  }

  const bibleUpdate = series_bible ?? seriesBible
  const planUpdate = story_plan ?? storyPlan

  if (bibleUpdate === undefined && planUpdate === undefined) {
    return NextResponse.json({ success: true })
  }

  const projectForMerge = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { seriesBibleTable: true, storyPlanTable: true },
  })

  if (!projectForMerge) {
    return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
  }

  await upsertMergedJsonContent({
    projectId,
    bibleUpdate,
    planUpdate,
    projectForMerge,
  })

  return NextResponse.json({ success: true })
}

export function cleanProjectResponse(project: {
  seriesBible: unknown
  storyPlan: unknown
  seriesBibleTable?: { content: unknown } | null
  storyPlanTable?: { content: unknown } | null
}) {
  const seriesBible = firstNonEmptyRecord(project.seriesBibleTable?.content, project.seriesBible)
  const storyPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)

  if (Object.keys(storyPlan).length === 0) {
    return { seriesBible, storyPlan }
  }

  const cleanedSeriesBible = withoutOverlappingLegacyFields(seriesBible, storyPlan)
  const setting = recordFromJson(cleanedSeriesBible.Setting)

  const seriesBibleClean =
    Object.keys(setting).length > 0
      ? {
          ...cleanedSeriesBible,
          Setting: withoutOverlappingLegacyFields(setting, storyPlan),
        }
      : cleanedSeriesBible

  return { seriesBible: seriesBibleClean, storyPlan }
}
