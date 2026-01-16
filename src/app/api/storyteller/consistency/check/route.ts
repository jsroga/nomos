/**
 * Consistency Check API
 *
 * POST /api/storyteller/consistency/check
 *
 * Runs a consistency check on story elements and returns detected
 * inconsistencies and proposed fixes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runConsistencyCheck } from '@/domains/storyteller/agents/consistency-agent'
import { ConsistencyCheckRequest } from '@/domains/storyteller/consistency/types'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for AI processing

export async function POST(request: NextRequest) {
  try {
    const body: ConsistencyCheckRequest = await request.json()

    const { projectId, episodeId, trigger } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!trigger || !trigger.context) {
      return NextResponse.json({ error: 'Trigger context is required' }, { status: 400 })
    }

    console.log('[Consistency Check API] Starting check for project:', projectId)

    // Run consistency check
    const result = await runConsistencyCheck(
      {
        projectId,
        episodeId,
        ...trigger.context,
      },
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
