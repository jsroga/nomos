import { beats } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import {
  ActionApiResultType,
  ApiErrorMessage,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { BeatStatus, BeatType } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/deep-merge'
import { BeatPayloadField } from '../constants/action-request-wire'
import { readSqlId, readSqlSequence, readStringField } from '../read-payload-fields'
import type { ActionHandler } from '../action-handler-context'

export const handleCreateBeat: ActionHandler = async (ctx, action) => {
  if (!ctx.episodeId) {
    return NextResponse.json(
      { error: ApiErrorMessage.EPISODE_ID_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  const existingBeats = await db.select().from(beats).where(eq(beats.episodeId, ctx.episodeId))
  const payload = action.payload

  const newBeat = {
    id: uuidv4(),
    episodeId: ctx.episodeId,
    sequence: existingBeats.length + 1,
    logline: readStringField(payload, BeatPayloadField.Logline),
    content:
      readStringField(payload, BeatPayloadField.Content) ||
      readStringField(payload, BeatPayloadField.Description),
    beatType: readStringField(payload, BeatPayloadField.BeatType, BeatType.COMPLICATION),
    status: BeatStatus.PROPOSED,
    charactersInvolved: Array.isArray(payload.charactersInvolved) ? payload.charactersInvolved : [],
    emotionalShifts: recordFromJson(payload.emotionalShifts),
    visualHook: readStringField(payload, BeatPayloadField.VisualHook),
    causalDependencies: Array.isArray(payload.causalDependencies) ? payload.causalDependencies : [],
    setupsPayoffs: recordFromJson(payload.setupsPayoffs),
    mazurElements: payload.mazurElements ?? null,
  }

  await db.insert(beats).values(newBeat)
  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BEAT_CREATED, beat: newBeat },
  })
}

export const handleUpdateBeat: ActionHandler = async (_ctx, action) => {
  const beatId = action.payload[BeatPayloadField.BeatId]
  if (typeof beatId !== 'string' || !beatId) {
    return NextResponse.json(
      { error: API_ERROR.BEAT_ID_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  const source = recordFromJson(action.payload[BeatPayloadField.Updates] || action.payload)
  const { [BeatPayloadField.BeatId]: _removed, ...updateData } = source

  await db
    .update(beats)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(beats.id, beatId))

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BEAT_UPDATED, beatId },
  })
}

export const handleDeleteBeat: ActionHandler = async (_ctx, action) => {
  const beatId = action.payload[BeatPayloadField.BeatId]
  if (typeof beatId !== 'string' || !beatId) {
    return NextResponse.json(
      { error: API_ERROR.BEAT_ID_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  await db.delete(beats).where(eq(beats.id, beatId))
  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BEAT_DELETED, beatId },
  })
}

export const handleReorderBeat: ActionHandler = async (_ctx, action) => {
  const beatId = readSqlId(action.payload[BeatPayloadField.BeatId])
  const newIndex = readSqlSequence(action.payload[BeatPayloadField.NewIndex])

  await db
    .update(beats)
    .set({ sequence: newIndex, updatedAt: new Date() })
    .where(eq(beats.id, beatId))

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BEAT_REORDERED, beatId, newIndex },
  })
}
