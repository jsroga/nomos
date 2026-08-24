import { NextRequest } from 'next/server'
import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { noStoreJson } from '@/shared/data/polling/no-store-json'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return noStoreJson({ error: API_ERROR.UNAUTHORIZED }, 401)

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return noStoreJson({ error: API_ERROR.RUN_ID_PARAM_REQUIRED }, 400)
    }

    const run = await retrieveOwnedRun(runId, session.user.id)


    return noStoreJson({
      status: run.status,
      output: run.output,
      error: run.error,
      metadata: run.metadata,
    })
  } catch (error) {
    // Missing, or owned by another tenant: same response either way, so a
    // 404 never confirms that someone else's run id exists.
    if (error instanceof JobAccessError) {
      return noStoreJson({ error: API_ERROR.RUN_NOT_FOUND }, 404)
    }
    console.error(API_LOG_PREFIX.TASK_STATUS_ERROR, error)
    return noStoreJson({ error: API_ERROR.INTERNAL_SERVER_ERROR }, 500)
  }
}
