/**
 * Background job run — the one ownership-checked reader.
 *
 * Replaces thirteen copies of `runs.retrieve(runId)` that authenticated the
 * caller and then returned any tenant's run. Ownership lives in
 * `@/shared/jobs`; this route only maps the failure to a status code.
 */
import { NextRequest } from 'next/server'
import { JobAccessError, retrieveOwnedRun } from '@/shared/jobs'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { noStoreJson } from '@/shared/data/polling/no-store-json'
import { HttpStatus } from '@/shared/data/constants/protocol'

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ runId: string }> }
) {
  const { runId } = await props.params

  try {
    const { session } = await requireAuth()
    if (!session) return noStoreJson({ error: API_ERROR.UNAUTHORIZED }, HttpStatus.UNAUTHORIZED)

    const run = await retrieveOwnedRun(runId, session.user.id)
    return noStoreJson(run)
  } catch (error) {
    // A run the caller does not own is reported as missing: 403 would confirm
    // that someone else's run id exists.
    if (error instanceof JobAccessError) {
      return noStoreJson({ error: API_ERROR.RUN_NOT_FOUND }, HttpStatus.NOT_FOUND)
    }
    console.error(API_LOG_PREFIX.TASK_STATUS_ERROR, error)
    return noStoreJson(
      { error: API_ERROR.INTERNAL_SERVER_ERROR },
      HttpStatus.INTERNAL
    )
  }
}
