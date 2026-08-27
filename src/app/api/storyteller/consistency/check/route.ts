/**
 * Consistency Check API
 *
 * POST /api/storyteller/consistency/check
 *
 * Runs a consistency check on story elements and returns detected
 * inconsistencies and proposed fixes.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  runConsistencyCheck,
} from '@/domains/storyteller/server'
import type { ConsistencyCheckRequest } from '@/domains/storyteller/core/types/consistency-types'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body: ConsistencyCheckRequest = await request.json()
    const { projectId, episodeId, trigger } = body

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
    }

    // Verify project access
    if (!(await tryProjectScope(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    if (!trigger || !trigger.context) {
      return NextResponse.json({ error: API_ERROR.TRIGGER_CONTEXT_REQUIRED }, { status: 400 })
    }

    console.log(API_LOG_PREFIX.CONSISTENCY_CHECK_START, projectId)

    const result = await runConsistencyCheck(
      { ...trigger.context, projectId, episodeId },
      trigger.action
    )

    console.log(API_LOG_PREFIX.CONSISTENCY_CHECK_COMPLETE, {
      inconsistencies: result.inconsistencies.length,
      fixes: result.fixes.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error(API_LOG_PREFIX.CONSISTENCY_CHECK_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_RUN_CONSISTENCY_CHECK,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
