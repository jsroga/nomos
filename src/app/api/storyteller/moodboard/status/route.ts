import { NextRequest } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { noStoreJson } from '@/shared/data/polling/no-store-json'

export async function GET(request: NextRequest) {
  let runId: string | null = null
  try {
    const { session } = await requireAuth()
    if (!session) return noStoreJson({ error: API_ERROR.UNAUTHORIZED }, 401)

    const { searchParams } = new URL(request.url)
    runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return noStoreJson({ error: API_ERROR.MISSING_RUN_ID }, 400)
    }

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
    console.error(API_LOG_PREFIX.MOODBOARD_STATUS_ERROR, error)

    return noStoreJson(
      { error: getErrorMessage(error) || API_ERROR.FAILED_GET_STATUS },
      500,
    )
  }
}
