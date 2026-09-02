import { projects, seriesBibles, storyPlans } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { ApiErrorMessage } from '@/shared/data/constants/protocol'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'

export async function updateSeriesBibleContent(
  projectId: string | undefined,
  updates: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!projectId) throw new Error(ApiErrorMessage.PROJECT_ID_REQUIRED)

  const [existing] = await db
    .select()
    .from(seriesBibles)
    .where(eq(seriesBibles.projectId, projectId))
    .limit(1)

  const currentContent = recordFromJson(existing?.content)
  const updatedContent = deepMergeRecords(currentContent, updates)

  await db
    .insert(seriesBibles)
    .values({ projectId, content: updatedContent, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: seriesBibles.projectId,
      set: { content: updatedContent, updatedAt: new Date() },
    })

  await db
    .update(projects)
    .set({ seriesBible: updatedContent, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  return updatedContent
}

export async function updateStoryPlanContent(
  projectId: string | undefined,
  updates: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!projectId) throw new Error(ApiErrorMessage.PROJECT_ID_REQUIRED)

  const [existing] = await db
    .select()
    .from(storyPlans)
    .where(eq(storyPlans.projectId, projectId))
    .limit(1)

  const currentContent = recordFromJson(existing?.content)
  console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_BEFORE_KEYS, Object.keys(currentContent))
  const worldDescription = currentContent.worldDescription
  console.log(
    API_LOG_PREFIX.UPDATE_STORY_PLAN_BEFORE_WORLD,
    typeof worldDescription === 'string' ? worldDescription.slice(0, 80) : worldDescription
  )
  console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_INCOMING_KEYS, Object.keys(updates))
  const incomingWorldDescription = updates.worldDescription
  console.log(
    API_LOG_PREFIX.UPDATE_STORY_PLAN_INCOMING_WORLD,
    typeof incomingWorldDescription === 'string'
      ? incomingWorldDescription.slice(0, 80)
      : incomingWorldDescription
  )

  const updatedContent = deepMergeRecords(currentContent, updates)

  console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_AFTER_KEYS, Object.keys(updatedContent))
  const mergedWorldDescription = updatedContent.worldDescription
  console.log(
    API_LOG_PREFIX.UPDATE_STORY_PLAN_AFTER_WORLD,
    typeof mergedWorldDescription === 'string'
      ? mergedWorldDescription.slice(0, 80)
      : mergedWorldDescription
  )

  await db
    .insert(storyPlans)
    .values({ projectId, content: updatedContent, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: storyPlans.projectId,
      set: { content: updatedContent, updatedAt: new Date() },
    })

  await persistBibleOwnedPlanFields(projectId, updates)

  console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_WRITE_COMPLETE)

  return updatedContent
}

export function createContentUpdateHelpers(projectId: string | undefined) {
  return {
    updateSeriesBible: (updates: Record<string, unknown>) =>
      updateSeriesBibleContent(projectId, updates),
    updateStoryPlan: (updates: Record<string, unknown>) =>
      updateStoryPlanContent(projectId, updates),
  }
}
