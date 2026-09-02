import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { tryProjectScope } from '@/shared/auth/project-scope'
import '@/domains/storyteller/core/io/mastra-runtime'
import {
  readFixInconsistenciesRun,
  resumeFixInconsistenciesRun,
} from '@/domains/storyteller/core/io/fix-inconsistencies-run'
import { parseFixInconsistenciesResumeBody } from '@/domains/storyteller/core/io/fix-inconsistencies-resume-parse'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

    const parsed = parseFixInconsistenciesResumeBody(await request.json())
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, runId: parsed.runId }, { status: parsed.status })
    }

    if (!(await tryProjectScope(parsed.data.projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const result = await resumeFixInconsistenciesRun(parsed.data.runId, parsed.data.action)
    if (!result.ok) {
      return NextResponse.json({ error: result.error, runId: parsed.data.runId }, { status: result.status })
    }
    return NextResponse.json({ success: true, runId: parsed.data.runId, output: result.output })
  } catch (error) {
    console.error(API_LOG_PREFIX.FIX_INCONSISTENCIES_RESUME_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_SERVER_ERROR }, { status: HttpStatus.INTERNAL })
  }
}

export async function GET(request: NextRequest) {
  const { session } = await requireAuth()
  if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })

  const runId = request.nextUrl.searchParams.get(QueryParam.RunId)
  if (!runId) {
    return NextResponse.json({ error: API_ERROR.RUN_ID_QUERY_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }

  const result = await readFixInconsistenciesRun(runId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error, runId }, { status: result.status })
  }
  return NextResponse.json(result)
}
