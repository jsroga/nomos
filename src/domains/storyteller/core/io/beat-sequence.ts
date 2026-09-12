import { db } from '@/db/client'
import { beats, projects } from '@/db/schema'
import { eq, max, sql } from 'drizzle-orm'
import {
  BEAT_SEQUENCE_REORDER_OFFSET,
  completeBeatOrder,
  nextSequenceAfter,
} from '@/domains/storyteller/core/utils/beat-order'

export { db, nextSequenceAfter }

export async function nextBeatSequence(episodeId: string): Promise<number> {
  const [row] = await db
    .select({ maxSeq: max(beats.sequence) })
    .from(beats)
    .where(eq(beats.episodeId, episodeId))
  return nextSequenceAfter(row?.maxSeq)
}

export async function rewriteBeatSequences(
  episodeId: string,
  orderedIds: readonly string[],
): Promise<void> {
  const existing = await db
    .select({ id: beats.id, sequence: beats.sequence })
    .from(beats)
    .where(eq(beats.episodeId, episodeId))
  const nextOrder = completeBeatOrder(orderedIds, existing)
  if (nextOrder.length === 0) return

  await db.transaction(async tx => {
    await tx
      .update(beats)
      .set({ sequence: sql`${beats.sequence} + ${BEAT_SEQUENCE_REORDER_OFFSET}` })
      .where(eq(beats.episodeId, episodeId))
    for (const [index, beatId] of nextOrder.entries()) {
      await tx
        .update(beats)
        .set({ sequence: index + 1, updatedAt: new Date() })
        .where(eq(beats.id, beatId))
    }
  })
}

export async function loadProjectMasterPrompt(projectId: string): Promise<string> {
  const rows = await db
    .select({ masterPrompt: projects.masterPrompt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return rows[0]?.masterPrompt ?? ''
}
