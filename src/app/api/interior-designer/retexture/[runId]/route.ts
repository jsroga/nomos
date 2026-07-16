import { runs } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorRetextureParamsSchema,
  interiorRetextureStatusResponseSchema,
} from '@/domains/interior-designer/core/io/interior-designer.dto'
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

    const run = await runs.retrieve(runId)

    return NextResponse.json(
      interiorRetextureStatusResponseSchema.parse({
        status: run.status,
        output: run.output,
        error: run.error,
      })
    )
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.RETEXTURE_STATUS_FAILED, error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
