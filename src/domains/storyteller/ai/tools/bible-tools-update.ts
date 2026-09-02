import { filterValidSoundtrackTracks } from '@/domains/storyteller/core/utils/youtube-utils'
import { resolveSoundtrackTracks } from '@/domains/storyteller/core/io/resolve-soundtrack-links'
import '@/shared/data/server-guard'
import { projects, storyPlans, episodes } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'
import { narrowPremiseRecord } from '@/domains/storyteller/core/utils/requested-episode-premise-field'

export enum BibleToolLog {
  OffSectionFields = '[update_world_bible] Off-section fields for ',
  ExecuteStart = '[update_world_bible] execute start fields=',
  ExecuteDone = '[update_world_bible] execute done ',
  DroppedSoundtracks = '[update_world_bible] No YouTube match, track dropped: ',
}

const SOUNDTRACKS_KEY = 'soundtracks'

export enum BibleToolError {
  NoFields = 'No bible fields to update',
  NoFieldsForSectionPrefix = 'No fields allowed for section "',
  NoFieldsForSectionSuffix = '" in this tool call',
  ProjectIdRequired = 'projectId is required from the open workspace',
  InvalidSoundtrackUrls = 'Invalid YouTube soundtrack URL(s): ',
  UnresolvedSoundtracks =
    'No real YouTube video could be found for any proposed track. Give the correct song title and artist — the link is resolved by search, so youtubeUrl is ignored: ',
}

/** Omit from tool args — the authenticated request injects it. */
export { INJECTED_PROJECT_ID_DESC as BIBLE_TOOL_PROJECT_ID_DESC } from './manage-tools-wire'

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
  await persistBibleOwnedPlanFields(existing.projectId, existingPlan)
  const newPlan = omitBibleOwnedPlanFields({
    ...existingPlan,
    premise: {
      ...recordFromJson(existingPlan.premise),
      ...premise,
    },
  })
  await db
    .update(episodes)
    .set({
      premise: JSON.stringify(premise),
      storyPlan: newPlan,
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId))
}

/**
 * Replace every proposed soundtrack link with one resolved from a real YouTube
 * search. The model's `youtubeUrl` is never trusted — it cannot know video ids,
 * so it invents well-formed ones that 404 (or land on an unrelated video).
 */
export async function resolveSoundtrackLinks(
  proposed: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tracks = proposed[SOUNDTRACKS_KEY]
  if (!Array.isArray(tracks) || tracks.length === 0) return proposed
  const { valid } = filterValidSoundtrackTracks(tracks)
  const { resolved, unresolved } = await resolveSoundtrackTracks(valid)
  if (resolved.length === 0) {
    throw new Error(`${BibleToolError.UnresolvedSoundtracks}${unresolved.join(', ')}`)
  }
  if (unresolved.length > 0) {
    console.warn(`${BibleToolLog.DroppedSoundtracks}${unresolved.join(', ')}`)
  }
  return { ...proposed, [SOUNDTRACKS_KEY]: resolved }
}

export function proposedFieldsFromInput(
  input: Record<string, unknown>
): Record<string, unknown> {
  const proposed: Record<string, unknown> = {}
  for (const key of UPDATE_FIELD_KEYS) {
    const value = input[key]
    if (value === undefined) continue
    if (key === SOUNDTRACKS_KEY) {
      const { valid, invalidUrls } = filterValidSoundtrackTracks(value)
      if (invalidUrls.length > 0) {
        throw new Error(`${BibleToolError.InvalidSoundtrackUrls}${invalidUrls.join(', ')}`)
      }
      if (valid.length > 0) proposed.soundtracks = valid
      continue
    }
    proposed[key] = value
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
  await persistBibleOwnedPlanFields(projectId, updates)
}
