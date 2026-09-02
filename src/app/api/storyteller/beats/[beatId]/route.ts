import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { beats } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { verifyBeatAccess } from '@/domains/storyteller/server'
import { pickBeatPatchUpdates } from '@/domains/storyteller/core/beat-patch'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'

const BeatPatchBodySchema = z.record(z.unknown())

export async function PATCH(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const { beatId } = params
    const access = await verifyBeatAccess(beatId, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: API_ERROR.BEAT_PROJECT_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    const body = BeatPatchBodySchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: API_ERROR.INVALID_PAYLOAD }, { status: HttpStatus.BAD_REQUEST })
    }
    const update = pickBeatPatchUpdates(body.data)
    const [updatedBeat] = await db.update(beats).set(update).where(eq(beats.id, beatId)).returning()

    return NextResponse.json(updatedBeat)
  } catch (error) {
    console.error(API_LOG_PREFIX.BEAT_UPDATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_BEAT }, { status: HttpStatus.INTERNAL })
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const { beatId } = params
    const access = await verifyBeatAccess(beatId, session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: API_ERROR.BEAT_PROJECT_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    await db.delete(beats).where(eq(beats.id, beatId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.BEAT_DELETE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_BEAT }, { status: HttpStatus.INTERNAL })
  }
}
