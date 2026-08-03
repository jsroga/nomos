import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ErrorFragment, QueryParam } from '@/shared/data/constants/protocol'

export const GET = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get(QueryParam.RunId)

  if (!runId) {
    return NextResponse.json({ error: API_ERROR.MISSING_RUN_ID_PARAM }, { status: 400 })
  }

  try {
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
    console.error(API_LOG_PREFIX.UPSCALE_STATUS_ERROR, error)

    if (getErrorMessage(error)?.includes(ErrorFragment.NotFound)) {
      return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.FAILED_GET_STATUS },
      { status: 500 }
    )
  }
})
