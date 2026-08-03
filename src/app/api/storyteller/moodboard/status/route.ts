import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'

export async function GET(request: NextRequest) {
  let runId: string | null = null
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(request.url)
    runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return NextResponse.json({ error: API_ERROR.MISSING_RUN_ID }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    if (!run) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json({
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      metadata: run.metadata,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.MOODBOARD_STATUS_ERROR, error)

    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.FAILED_GET_STATUS },
      { status: 500 }
    )
  }
}
