import { db } from '@/domains/storyteller/core/io/beat-sequence'
import { beats, episodes, setups } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

export interface UpsertSetupsFromBeatInput {
  projectId: string
  beatId: string
  setupId?: string
  payoffFor?: string
}

export async function projectIdForEpisode(episodeId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ projectId: episodes.projectId })
    .from(episodes)
    .where(eq(episodes.id, episodeId))
  return row?.projectId
}

export async function projectIdForBeat(beatId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ projectId: episodes.projectId })
    .from(beats)
    .innerJoin(episodes, eq(episodes.id, beats.episodeId))
    .where(eq(beats.id, beatId))
  return row?.projectId
}

export async function listSetupRowsForProject(projectId: string): Promise<
  Array<{
    setupBeatId: string | null
    payoffBeatId: string | null
    description: string
    isResolved: boolean | null
  }>
> {
  return db
    .select({
      setupBeatId: setups.setupBeatId,
      payoffBeatId: setups.payoffBeatId,
      description: setups.description,
      isResolved: setups.isResolved,
    })
    .from(setups)
    .where(eq(setups.projectId, projectId))
}

export async function upsertSetupsFromBeat(input: UpsertSetupsFromBeatInput): Promise<void> {
  if (input.setupId) {
    await db
      .insert(setups)
      .values({
        projectId: input.projectId,
        setupBeatId: input.beatId,
        description: input.setupId,
        isResolved: false,
      })
      .onConflictDoNothing({ target: [setups.projectId, setups.description] })
  }

  if (!input.payoffFor) return

  const [existing] = await db
    .select()
    .from(setups)
    .where(
      and(eq(setups.projectId, input.projectId), eq(setups.description, input.payoffFor))
    )

  if (existing) {
    await db
      .update(setups)
      .set({ payoffBeatId: input.beatId, isResolved: true })
      .where(eq(setups.id, existing.id))
    return
  }

  await db.insert(setups).values({
    projectId: input.projectId,
    payoffBeatId: input.beatId,
    description: input.payoffFor,
    isResolved: true,
  })
}
