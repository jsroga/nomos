import { NextRequest, NextResponse } from 'next/server'
import { JobAccessError, cancelOwnedRun, retrieveOwnedRun } from '@/shared/jobs'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { noStoreJson } from '@/shared/data/polling/no-store-json'

const TRIGGER_RUN_STATUS_NOT_FOUND = 'NOT_FOUND'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return noStoreJson({ error: API_ERROR.UNAUTHORIZED }, 401)

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return noStoreJson({ error: API_ERROR.MISSING_RUN_ID }, 400)
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
      return noStoreJson({ status: TRIGGER_RUN_STATUS_NOT_FOUND }, 404)
    }
    console.error(API_LOG_PREFIX.TASK_STATUS_ERROR, error)
    return noStoreJson({ error: API_ERROR.INTERNAL_ERROR }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return NextResponse.json({ error: API_ERROR.MISSING_RUN_ID }, { status: 400 })
    }

    try {
      await cancelOwnedRun(runId, session.user.id)
    } catch (error) {
      // A run the caller does not own must not be cancellable, and must not
      // report success. Other cancel failures stay best-effort as before.
      if (error instanceof JobAccessError) {
        return NextResponse.json({ error: API_ERROR.RUN_NOT_FOUND }, { status: 404 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.TASK_STATUS_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
