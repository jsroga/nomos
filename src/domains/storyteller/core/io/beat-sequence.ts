import { db } from '@/db/client'
import { beats, projects } from '@/db/schema'
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

export async function loadProjectMasterPrompt(projectId: string): Promise<string> {
  const rows = await db
    .select({ masterPrompt: projects.masterPrompt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return rows[0]?.masterPrompt ?? ''
}
