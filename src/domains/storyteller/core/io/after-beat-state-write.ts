import '@/shared/data/server-guard'
import { eq } from 'drizzle-orm'
import { beats } from '@/db/schema'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import {
  AfterBeatStateSchema,
  AfterBeatStateWriteError,
  afterBeatStateRowSaved,
  type AfterBeatState,
} from '@/domains/storyteller/core/types/after-beat-state'

export async function writeAfterBeatState(beatId: string, state: AfterBeatState): Promise<void> {
  const parsed = AfterBeatStateSchema.parse(state)
  const updated = await db
    .update(beats)
    .set({ afterBeatState: parsed, updatedAt: new Date() })
    .where(eq(beats.id, beatId))
    .returning({ id: beats.id })
  if (!afterBeatStateRowSaved(updated)) {
    throw new Error(AfterBeatStateWriteError.SaveMissed)
  }
}
