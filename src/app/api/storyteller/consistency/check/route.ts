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
import type { ConsistencyCheckRequest } from '@/domains/storyteller/core/types/ConsistencyTypes'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: ConsistencyCheckRequest = await request.json()
    const { projectId, episodeId, trigger } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    if (!trigger || !trigger.context) {
      return NextResponse.json({ error: 'Trigger context is required' }, { status: 400 })
    }

    console.log('[Consistency Check API] Starting check for project:', projectId)

    const result = await runConsistencyCheck(
      { ...trigger.context, projectId, episodeId },
      trigger.action
    )

    console.log('[Consistency Check API] Check complete:', {
      inconsistencies: result.inconsistencies.length,
      fixes: result.fixes.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Consistency Check API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run consistency check',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
