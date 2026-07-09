/**
 * Bible Lock API
 *
 * POST /api/storyteller/bible/lock - Lock/unlock the Series Bible
 * GET /api/storyteller/bible/lock - Get Bible lock status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserSession, requireAuth } from '@/shared/auth/auth'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  storytellerBibleLockQuerySchema,
  storytellerBibleLockResponseSchema,
} from '@/domains/storyteller/io/storyteller.dto'
import { isCentralUser } from '@/shared/auth/bible-permissions'
import { verifyProjectAccess } from '@/domains/storyteller/server'

enum BibleLockAction {
  LOCK = 'lock',
  UNLOCK = 'unlock',
}

function parseBibleLockAction(value: unknown): BibleLockAction | undefined {
  const action = readString(value)
  if (action === BibleLockAction.LOCK || action === BibleLockAction.UNLOCK) {
    return action
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const action = parseBibleLockAction(body.action)

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Check if user is a central user
    if (!isCentralUser(session.user.email)) {
      return NextResponse.json(
        { error: 'Only central users can lock/unlock the Bible' },
        { status: 403 }
      )
    }

    if (!action) {
      return NextResponse.json({ error: 'Action must be "lock" or "unlock"' }, { status: 400 })
    }

    console.log(
      `[Bible Lock API] ${action} Bible for project ${projectId} by ${session.user.email}`
    )

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = {
      is_locked: action === BibleLockAction.LOCK,
      locked_by: action === BibleLockAction.LOCK ? session.user.email : null,
      locked_at: action === BibleLockAction.LOCK ? new Date().toISOString() : null,
    }

    const { error: updateError } = await supabase
      .from('series_bibles')
      .update(updates)
      .eq('project_id', projectId)

    if (updateError) {
      console.error('[Bible Lock API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update lock status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action,
      lockedBy: action === BibleLockAction.LOCK ? session.user.email : null,
      lockedAt: action === BibleLockAction.LOCK ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('[Bible Lock API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update Bible lock status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const parsedQuery = storytellerBibleLockQuerySchema.safeParse({
      projectId: searchParams.get('projectId'),
    })

    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const { projectId } = parsedQuery.data

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('series_bibles')
      .select('is_locked, locked_by, locked_at')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) {
      console.error('[Bible Lock API] Fetch error:', error)
      return NextResponse.json(
        storytellerBibleLockResponseSchema.parse({ isLocked: false, lockedBy: null, lockedAt: null }),
        { status: 200 }
      )
    }

    return NextResponse.json(
      storytellerBibleLockResponseSchema.parse({
        isLocked: data?.is_locked || false,
        lockedBy: data?.locked_by || null,
        lockedAt: data?.locked_at || null,
      })
    )
  } catch (error) {
    console.error('[Bible Lock API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get Bible lock status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
