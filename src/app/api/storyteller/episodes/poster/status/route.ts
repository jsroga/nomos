import { NextRequest, NextResponse } from 'next/server'
import { runs } from '@trigger.dev/sdk/v3'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam, TriggerRunStatus } from '@/shared/data/constants/protocol'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return NextResponse.json({ error: API_ERROR.MISSING_RUN_ID }, { status: 400 })
    }

    const run = await runs.retrieve(runId)

    if (!run) {
      return NextResponse.json({ status: TriggerRunStatus.NotFound }, { status: 404 })
    }

    return NextResponse.json({
      status: run.status,
      output: run.output,
      error: run.error,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.TASK_STATUS_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
