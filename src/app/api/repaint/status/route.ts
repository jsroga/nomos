import { NextRequest } from 'next/server'
import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ErrorFragment, QueryParam } from '@/shared/data/constants/protocol'
import { noStoreJson } from '@/shared/data/polling/no-store-json'

export const GET = withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get(QueryParam.RunId)

  if (!runId) {
    return noStoreJson({ error: API_ERROR.MISSING_RUN_ID_PARAM }, 400)
  }

  try {
    const run = await retrieveOwnedRun(runId, session.user.id)


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
    // Missing, or owned by another tenant: same response either way, so a
    // 404 never confirms that someone else's run id exists.
    if (error instanceof JobAccessError) {
      return noStoreJson({ error: API_ERROR.RUN_NOT_FOUND }, 404)
    }
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
