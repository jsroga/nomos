import '@/shared/data/server-guard'
import { projects, storyPlans, episodes } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'
import { narrowPremiseRecord } from '@/domains/storyteller/core/utils/requested-episode-premise-field'

export enum BibleToolLog {
  OffSectionFields = '[update_world_bible] Off-section fields for ',
}

export enum BibleToolError {
  NoFields = 'No bible fields to update',
  NoFieldsForSectionPrefix = 'No fields allowed for section "',
  NoFieldsForSectionSuffix = '" in this tool call',
}

export enum BibleToolMessage {
  ProposedPrefix = 'Proposed Story Plan updates (',
  ProposedSuffix = ' sections). Persist on Accept or Add to world.',
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
  'episodeRoadmap',
  'episodePremise',
] as const

export enum BibleEpisodePremiseError {
  EpisodeIdRequired =
    'episodePremise requires an open episode — create one with manage_episode (include data.premise) or select an episode first',
}

export async function persistEpisodePremiseUpdate(
  episodeId: string,
  premise: Record<string, unknown>
): Promise<void> {
  const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId)).limit(1)
  if (!existing) {
    throw new Error(`Episode ${episodeId} not found`)
  }
  const existingPlan = recordFromJson(existing.storyPlan)
  const newPlan = {
    ...existingPlan,
    premise: {
      ...recordFromJson(existingPlan.premise),
      ...premise,
    },
  }
  await db
    .update(episodes)
    .set({
      premise: JSON.stringify(premise),
      storyPlan: newPlan,
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId))
}

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

export function applyPremiseFieldNarrowing(
  updates: Record<string, unknown>,
  premiseField: string | undefined,
): Record<string, unknown> {
  if (!premiseField || updates.episodePremise === undefined) return updates
  return {
    ...updates,
    episodePremise: narrowPremiseRecord(recordFromJson(updates.episodePremise), premiseField),
  }
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
