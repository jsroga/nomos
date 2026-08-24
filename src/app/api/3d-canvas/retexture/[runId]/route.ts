import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorRetextureParamsSchema,
  interiorRetextureStatusResponseSchema,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { getErrorMessage } from '@/shared/errors/error-utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const parsedParams = interiorRetextureParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.issues[0]?.message }, { status: 400 })
    }

    const { runId } = parsedParams.data

    const run = await retrieveOwnedRun(runId, session.user.id)

    return NextResponse.json(
      interiorRetextureStatusResponseSchema.parse({
        status: run.status,
        output: run.output,
        error: run.error,
      })
    )
  } catch (error: unknown) {
    // Missing, or owned by another tenant: same response either way, so a
    // 404 never confirms that someone else's run id exists.
    if (error instanceof JobAccessError) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
    }
    console.error(API_LOG_PREFIX.RETEXTURE_STATUS_FAILED, error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
