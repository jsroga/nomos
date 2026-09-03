import { beats } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BeatType, BeatStatus } from '@/domains/storyteller/core/types/enums'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/deep-merge'
import type { BeatData } from './beat-tools-schema'
import { projectIdForEpisode, upsertSetupsFromBeat } from '@/domains/storyteller/core/io/setups-write'
import {
  BEAT_ACTION_FIELDS_PARTIAL_REQUIRED,
  BEAT_ACTION_FIELDS_REQUIRED,
  BEAT_LOCKED_DELETE_ERROR,
} from './manage-tools-wire'

type ActionFields = {
  actionTaken: string
  consequence: string
  storyStateChange: string
}

type BeatRow = typeof beats.$inferSelect

export function packSetupsPayoffs(
  setupsPayoffs: BeatData['setupsPayoffs'],
  action: ActionFields,
) {
  return { ...(setupsPayoffs ?? {}), ...action }
}

export function unpackActionFields(setupsPayoffs: unknown): Partial<ActionFields> {
  const value = recordFromJson(setupsPayoffs)
  return {
    actionTaken: typeof value.actionTaken === 'string' ? value.actionTaken : undefined,
    consequence: typeof value.consequence === 'string' ? value.consequence : undefined,
    storyStateChange:
      typeof value.storyStateChange === 'string' ? value.storyStateChange : undefined,
  }
}

function emotionalShiftsFromDb(
  value: unknown
): Record<string, { from: string; to: string }> | undefined {
  if (value == null) return undefined
  const record = recordFromJson(value)
  const out: Record<string, { from: string; to: string }> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('from' in entry) ||
      !('to' in entry) ||
      typeof entry.from !== 'string' ||
      typeof entry.to !== 'string'
    ) {
      continue
    }
    out[key] = { from: entry.from, to: entry.to }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function beatResponse(beat: BeatRow) {
  const action = unpackActionFields(beat.setupsPayoffs)
  return {
    id: beat.id,
    episodeId: beat.episodeId,
    sequence: beat.sequence,
    logline: beat.logline,
    content: beat.content ?? undefined,
    beatType: beat.beatType,
    status: beat.status ?? 'proposed',
    actionTaken: action.actionTaken,
    consequence: action.consequence,
    storyStateChange: action.storyStateChange,
    visualHook: beat.visualHook ?? undefined,
    charactersInvolved: stringArrayFromJson(beat.charactersInvolved),
    emotionalShifts: emotionalShiftsFromDb(beat.emotionalShifts),
    causalDependencies: stringArrayFromJson(beat.causalDependencies),
    setupsPayoffs: recordFromJson(beat.setupsPayoffs),
  }
}

function setupsPayoffsFromDb(value: unknown): BeatData['setupsPayoffs'] {
  if (value == null) return undefined
  const record = recordFromJson(value)
  return {
    setupId: typeof record.setupId === 'string' ? record.setupId : undefined,
    payoffFor: typeof record.payoffFor === 'string' ? record.payoffFor : undefined,
  }
}

function validateCreateActionFields(data: BeatData) {
  if (!data.actionTaken || !data.consequence || !data.storyStateChange) {
    return {
      success: false as const,
      error: BEAT_ACTION_FIELDS_REQUIRED,
    }
  }
  return null
}

function validateUpdateActionFields(data: BeatData) {
  const hasPartialAction =
    data.actionTaken !== undefined ||
    data.consequence !== undefined ||
    data.storyStateChange !== undefined

  if (hasPartialAction && (!data.actionTaken || !data.consequence || !data.storyStateChange)) {
    return {
      success: false as const,
      error: BEAT_ACTION_FIELDS_PARTIAL_REQUIRED,
    }
  }
  return null
}

export function proposedBeatFromData(
  episodeId: string,
  sequence: number,
  data: BeatData,
  id: string,
) {
  const actionTaken = data.actionTaken ?? ''
  const consequence = data.consequence ?? ''
  const storyStateChange = data.storyStateChange ?? ''
  return {
    id,
    episodeId,
    sequence,
    logline: data.logline,
    content: data.content,
    beatType: data.beatType ?? BeatType.SETUP,
    status: BeatStatus.PROPOSED,
    actionTaken,
    consequence,
    storyStateChange,
    visualHook: data.visualHook,
    charactersInvolved: data.charactersInvolved ?? [],
    emotionalShifts: data.emotionalShifts,
    causalDependencies: data.causalDependencies ?? [],
    setupsPayoffs: packSetupsPayoffs(data.setupsPayoffs, {
      actionTaken,
      consequence,
      storyStateChange,
    }),
  }
}

export async function createBeatOperation(
  episodeId: string,
  sequence: number | undefined,
  data: BeatData,
  persist = true,
) {
  const actionError = validateCreateActionFields(data)
  if (actionError) return actionError

  const newBeatId = uuidv4()
  const beatSequence = sequence ?? 1
  const proposed = proposedBeatFromData(episodeId, beatSequence, data, newBeatId)

  if (!persist) {
    return {
      success: true as const,
      message: `Created beat "${data.logline}" at sequence ${beatSequence}`,
      beat: proposed,
    }
  }

  await db.insert(beats).values({
    id: newBeatId,
    episodeId,
    sequence: beatSequence,
    logline: data.logline,
    content: data.content ?? null,
    beatType: data.beatType ?? BeatType.SETUP,
    status: BeatStatus.PROPOSED,
    visualHook: data.visualHook ?? null,
    charactersInvolved: data.charactersInvolved ?? [],
    emotionalShifts: data.emotionalShifts ?? null,
    causalDependencies: data.causalDependencies ?? [],
    setupsPayoffs: proposed.setupsPayoffs,
  })

  const [created] = await db.select().from(beats).where(eq(beats.id, newBeatId))

  const projectId = await projectIdForEpisode(episodeId)
  if (projectId) {
    await upsertSetupsFromBeat({
      projectId,
      beatId: newBeatId,
      setupId: data.setupsPayoffs?.setupId,
      payoffFor: data.setupsPayoffs?.payoffFor,
    })
  }

  return {
    success: true as const,
    message: `Created beat "${data.logline}" at sequence ${beatSequence}`,
    beat: beatResponse(created),
  }
}

function applyBeatScalarFields(
  updateFields: Partial<typeof beats.$inferInsert>,
  data: BeatData,
) {
  if (data.logline !== undefined) updateFields.logline = data.logline
  if (data.content !== undefined) updateFields.content = data.content
  if (data.visualHook !== undefined) updateFields.visualHook = data.visualHook
  if (data.beatType !== undefined) updateFields.beatType = data.beatType
  if (data.charactersInvolved !== undefined) updateFields.charactersInvolved = data.charactersInvolved
  if (data.emotionalShifts !== undefined) updateFields.emotionalShifts = data.emotionalShifts
  if (data.causalDependencies !== undefined) updateFields.causalDependencies = data.causalDependencies
  if (data.setupsPayoffs !== undefined) updateFields.setupsPayoffs = data.setupsPayoffs
}

async function applyBeatActionFields(
  beatId: string,
  updateFields: Partial<typeof beats.$inferInsert>,
  data: BeatData,
) {
  const [existing] = await db.select().from(beats).where(eq(beats.id, beatId))
  const existingAction = unpackActionFields(existing?.setupsPayoffs)
  updateFields.setupsPayoffs = packSetupsPayoffs(
    data.setupsPayoffs ?? setupsPayoffsFromDb(existing?.setupsPayoffs),
    {
      actionTaken: data.actionTaken ?? existingAction.actionTaken ?? '',
      consequence: data.consequence ?? existingAction.consequence ?? '',
      storyStateChange: data.storyStateChange ?? existingAction.storyStateChange ?? '',
    },
  )
}

async function buildBeatUpdateFields(
  beatId: string,
  data: BeatData,
): Promise<Partial<typeof beats.$inferInsert>> {
  const updateFields: Partial<typeof beats.$inferInsert> = { updatedAt: new Date() }
  applyBeatScalarFields(updateFields, data)

  const hasActionUpdate =
    data.actionTaken !== undefined ||
    data.consequence !== undefined ||
    data.storyStateChange !== undefined

  if (hasActionUpdate) {
    await applyBeatActionFields(beatId, updateFields, data)
  }

  return updateFields
}

export async function updateBeatOperation(beatId: string, data: BeatData) {
  const actionError = validateUpdateActionFields(data)
  if (actionError) return actionError

  const updateFields = await buildBeatUpdateFields(beatId, data)
  await db.update(beats).set(updateFields).where(eq(beats.id, beatId))

  const [updated] = await db.select().from(beats).where(eq(beats.id, beatId))
  if (!updated) {
    return { success: false as const, error: `Beat ${beatId} not found` }
  }

  if (data.setupsPayoffs !== undefined) {
    const projectId = await projectIdForEpisode(updated.episodeId)
    if (projectId) {
      await upsertSetupsFromBeat({
        projectId,
        beatId,
        setupId: data.setupsPayoffs.setupId,
        payoffFor: data.setupsPayoffs.payoffFor,
      })
    }
  }

  return {
    success: true as const,
    message: `Updated beat "${updated.logline}"`,
    beat: beatResponse(updated),
  }
}

export async function deleteBeatOperation(beatId: string) {
  const [beat] = await db.select().from(beats).where(eq(beats.id, beatId))
  if (!beat) {
    return { success: false as const, error: `Beat ${beatId} not found` }
  }
  if (beat.status === BeatStatus.LOCKED) {
    return { success: false as const, error: BEAT_LOCKED_DELETE_ERROR }
  }

  await db.delete(beats).where(eq(beats.id, beatId))
  return { success: true as const, message: `Deleted beat "${beat.logline}"` }
}

export async function getBeatOperation(beatId: string) {
  const [beat] = await db.select().from(beats).where(eq(beats.id, beatId))
  if (!beat) {
    return { success: false as const, error: `Beat ${beatId} not found` }
  }
  return { success: true as const, beat: beatResponse(beat) }
}
