import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { beats, episodes, projects } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/services/access-verification-service'
import { formatCanonEpisodeLock } from '@/domains/storyteller/services/story-canon-pack-format'
import { loadOpenEpisodeCanon } from '@/domains/storyteller/services/story-canon-pack'
import { readString, recordFromJson } from '@/shared/data/json-guards'

export enum BeatCanonLookupError {
  NotFound = 'not_found',
  Forbidden = 'forbidden',
}

export type BeatEpisodeLockResult =
  | { ok: true; lock: string }
  | { ok: false; error: BeatCanonLookupError }

function beatIdFromUnknown(beat: unknown): string | undefined {
  return readString(recordFromJson(beat).id)
}

export function readBeatId(beat: unknown): string | undefined {
  const id = beatIdFromUnknown(beat)
  return id && id.length > 0 ? id : undefined
}

export async function loadBeatEpisodeLock(input: {
  beatId: string
  projectIdHint?: string
  userId: string
}): Promise<BeatEpisodeLockResult> {
  const row = await db
    .select({
      projectId: projects.id,
      episodeId: episodes.id,
    })
    .from(beats)
    .innerJoin(episodes, eq(beats.episodeId, episodes.id))
    .innerJoin(projects, eq(episodes.projectId, projects.id))
    .where(eq(beats.id, input.beatId))
    .then(rows => rows[0])

  if (!row) return { ok: false, error: BeatCanonLookupError.NotFound }
  if (input.projectIdHint && input.projectIdHint !== row.projectId) {
    return { ok: false, error: BeatCanonLookupError.Forbidden }
  }
  if (!(await verifyProjectAccess(row.projectId, input.userId))) {
    return { ok: false, error: BeatCanonLookupError.Forbidden }
  }

  const canon = await loadOpenEpisodeCanon(row.projectId, row.episodeId)
  return { ok: true, lock: canon ? formatCanonEpisodeLock(canon) : '' }
}
