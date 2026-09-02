import { episodes } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { EpisodeData } from './episode-tools-schema'
import { episodeWriteDataWithoutPremise } from './episode-write-data'

type EpisodeRow = typeof episodes.$inferSelect

function storyPlanRecord(value: unknown): Record<string, unknown> | undefined {
  return value == null ? undefined : recordFromJson(value)
}

export function episodeResponse(episode: EpisodeRow) {
  return {
    id: episode.id,
    projectId: episode.projectId,
    title: episode.title ?? '',
    sequence: episode.sequence,
    thematicFocus: episode.thematicFocus ?? undefined,
    premise: episode.premise ?? undefined,
    storyPlan: storyPlanRecord(episode.storyPlan)
      ? omitBibleOwnedPlanFields(recordFromJson(episode.storyPlan))
      : undefined,
    thumbnailUrl: episode.posterUrl ?? undefined,
  }
}

function buildStoryPlanData(data: EpisodeData): Record<string, unknown> | null {
  const storyPlanData = omitBibleOwnedPlanFields(recordFromJson(data.storyPlan))
  return Object.keys(storyPlanData).length > 0 ? storyPlanData : null
}

async function persistIncomingBibleOwned(projectId: string, data: EpisodeData) {
  if (data.storyPlan === undefined) return
  await persistBibleOwnedPlanFields(projectId, recordFromJson(data.storyPlan))
}

async function resolveEpisodeSequence(projectId: string, sequence?: number) {
  if (sequence) return sequence
  const existing = await db.select().from(episodes).where(eq(episodes.projectId, projectId))
  return existing.length + 1
}

function buildEpisodeUpdateFields(
  existing: EpisodeRow,
  data: EpisodeData,
): Partial<typeof episodes.$inferInsert> {
  const updateFields: Partial<typeof episodes.$inferInsert> = { updatedAt: new Date() }
  if (data.title !== undefined) updateFields.title = data.title
  if (data.sequence !== undefined) updateFields.sequence = data.sequence
  if (data.thematicFocus !== undefined) updateFields.thematicFocus = data.thematicFocus
  if (data.storyPlan !== undefined) {
    const currentStoryPlan = omitBibleOwnedPlanFields(recordFromJson(existing.storyPlan))
    const incoming = omitBibleOwnedPlanFields(recordFromJson(data.storyPlan))
    updateFields.storyPlan = { ...currentStoryPlan, ...incoming }
  }
  if (data.thumbnailUrl !== undefined) updateFields.posterUrl = data.thumbnailUrl
  return updateFields
}

export async function createEpisodeOperation(projectId: string, data: EpisodeData) {
  const persistable = episodeWriteDataWithoutPremise(data)
  await persistIncomingBibleOwned(projectId, persistable)
  const sequence = await resolveEpisodeSequence(projectId, persistable.sequence)
  const newEpisodeId = uuidv4()
  const storyPlan = buildStoryPlanData(persistable)

  await db.insert(episodes).values({
    id: newEpisodeId,
    projectId,
    title: persistable.title,
    sequence,
    thematicFocus: persistable.thematicFocus ?? null,
    premise: null,
    storyPlan,
    posterUrl: persistable.thumbnailUrl ?? null,
  })

  const [created] = await db.select().from(episodes).where(eq(episodes.id, newEpisodeId))

  return {
    success: true as const,
    message: `Created Episode ${sequence}: "${data.title}"`,
    episode: episodeResponse(created),
  }
}

export async function updateEpisodeOperation(episodeId: string, data: EpisodeData) {
  const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!existing) {
    return { success: false as const, error: `Episode ${episodeId} not found` }
  }

  const persistable = episodeWriteDataWithoutPremise(data)
  await persistIncomingBibleOwned(existing.projectId, persistable)
  const updateFields = buildEpisodeUpdateFields(existing, persistable)
  const persistedKeys = Object.keys(updateFields).filter(key => key !== 'updatedAt')
  if (persistedKeys.length === 0) {
    return {
      success: true as const,
      message: `Proposed episode updates for "${existing.title}"`,
      episode: episodeResponse(existing),
    }
  }

  await db.update(episodes).set(updateFields).where(eq(episodes.id, episodeId))

  const [updated] = await db.select().from(episodes).where(eq(episodes.id, episodeId))

  return {
    success: true as const,
    message: `Updated episode "${updated.title}"`,
    episode: episodeResponse(updated),
  }
}

export async function deleteEpisodeOperation(episodeId: string) {
  const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!episode) {
    return { success: false as const, error: `Episode ${episodeId} not found` }
  }

  await db.delete(episodes).where(eq(episodes.id, episodeId))
  return { success: true as const, message: `Deleted episode "${episode.title}"` }
}

export async function getEpisodeOperation(episodeId: string) {
  const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!episode) {
    return { success: false as const, error: `Episode ${episodeId} not found` }
  }
  return { success: true as const, episode: episodeResponse(episode) }
}
