import { NextRequest } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ErrorFragment, QueryParam } from '@/shared/data/constants/protocol'
import { noStoreJson } from '@/shared/data/polling/no-store-json'

export const GET = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get(QueryParam.RunId)

  if (!runId) {
    return noStoreJson({ error: API_ERROR.MISSING_RUN_ID_PARAM }, 400)
  }

  try {
    const run = await runs.retrieve(runId)

    if (!run) {
      return noStoreJson({ error: API_ERROR.RUN_NOT_FOUND }, 404)
    }

    return noStoreJson({
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
    console.error(API_LOG_PREFIX.REPAINT_STATUS_ERROR, error)

    if (getErrorMessage(error)?.includes(ErrorFragment.NotFound)) {
      return noStoreJson({ error: API_ERROR.RUN_NOT_FOUND }, 404)
    }

    return noStoreJson(
      { error: getErrorMessage(error) || API_ERROR.FAILED_GET_STATUS },
      500,
    )
  }
})
