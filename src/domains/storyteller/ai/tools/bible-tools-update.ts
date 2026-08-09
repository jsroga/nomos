import '@/shared/data/server-guard'
import { projects, storyPlans } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'

export enum BibleToolLog {
  DroppedOffSection = '[update_world_bible] Dropped off-section fields for ',
}

export enum BibleToolError {
  NoFields = 'No bible fields to update',
  NoFieldsForSectionPrefix = 'No fields allowed for section "',
  NoFieldsForSectionSuffix = '" in this tool call',
}

const UPDATE_FIELD_KEYS = [
  'worldDescription',
  'items',
  'events',
  'factions',
  'worldRules',
  'plotTwists',
  'soundtracks',
  'moodSoundtrack',
  'inspirations',
] as const

export function proposedFieldsFromInput(
  input: Record<string, unknown>
): Record<string, unknown> {
  const proposed: Record<string, unknown> = {}
  for (const key of UPDATE_FIELD_KEYS) {
    const value = input[key]
    if (value !== undefined) proposed[key] = value
  }
  return proposed
}

export async function persistStoryPlanUpdates(
  projectId: string,
  currentStoryPlan: Record<string, unknown>,
  updates: Record<string, unknown>
): Promise<void> {
  const updatedStoryPlan = deepMergeRecords(currentStoryPlan, updates)
  await db
    .update(projects)
    .set({
      storyPlan: updatedStoryPlan,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  const [existingStoryPlan] = await db
    .select()
    .from(storyPlans)
    .where(eq(storyPlans.projectId, projectId))
    .limit(1)
  const currentStoryPlanContent = existingStoryPlan
    ? recordFromJson(existingStoryPlan.content)
    : {}
  const updatedStoryPlanContent = deepMergeRecords(currentStoryPlanContent, updates)
  await db
    .insert(storyPlans)
    .values({ projectId, content: updatedStoryPlanContent, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: storyPlans.projectId,
      set: { content: updatedStoryPlanContent, updatedAt: new Date() },
    })
}
