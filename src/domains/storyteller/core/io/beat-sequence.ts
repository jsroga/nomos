import { db } from '@/db/client'
import { beats } from '@/db/schema'
import { eq, max } from 'drizzle-orm'

export { db }

export function nextSequenceAfter(maxSequence: number | null | undefined): number {
  return (maxSequence ?? 0) + 1
}

export async function nextBeatSequence(episodeId: string): Promise<number> {
  const [row] = await db
    .select({ maxSeq: max(beats.sequence) })
    .from(beats)
    .where(eq(beats.episodeId, episodeId))
  return nextSequenceAfter(row?.maxSeq)
}
