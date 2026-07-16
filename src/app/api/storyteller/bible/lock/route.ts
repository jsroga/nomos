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
} from '@/domains/storyteller/core/io/storyteller.dto'
import { isCentralUser } from '@/shared/auth/bible-permissions'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam, SupabaseColumn, SupabaseTable } from '@/shared/data/constants/protocol'
import {
  BibleLockAction,
  BIBLE_LOCK_ACTION_INVALID,
} from '@/domains/storyteller/core/io/constants/bible-lock'

function parseBibleLockAction(value: unknown): BibleLockAction | undefined {
  const action = readString(value)
  if (action === BibleLockAction.Lock || action === BibleLockAction.Unlock) {
    return action
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const action = parseBibleLockAction(body.action)

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Check if user is a central user
    if (!isCentralUser(session.user.email)) {
      return NextResponse.json(
        { error: 'Only central users can lock/unlock the Bible' },
        { status: 403 }
      )
    }

    if (!action) {
      return NextResponse.json({ error: BIBLE_LOCK_ACTION_INVALID }, { status: 400 })
    }

    console.log(
      `[Bible Lock API] ${action} Bible for project ${projectId} by ${session.user.email}`
    )

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const updates = {
      is_locked: action === BibleLockAction.Lock,
      locked_by: action === BibleLockAction.Lock ? session.user.email : null,
      locked_at: action === BibleLockAction.Lock ? new Date().toISOString() : null,
    }

    const { error: updateError } = await supabase
      .from(SupabaseTable.SeriesBibles)
      .update(updates)
      .eq(SupabaseColumn.ProjectId, projectId)

    if (updateError) {
      console.error(API_LOG_PREFIX.BIBLE_LOCK_UPDATE_ERROR, updateError)
      return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_BIBLE_LOCK }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action,
      lockedBy: action === BibleLockAction.Lock ? session.user.email : null,
      lockedAt: action === BibleLockAction.Lock ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.BIBLE_LOCK_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_UPDATE_BIBLE_LOCK_STATUS,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const parsedQuery = storytellerBibleLockQuerySchema.safeParse({
      projectId: searchParams.get(QueryParam.ProjectId),
    })

    if (!parsedQuery.success) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: 400 })
    }

    const { projectId } = parsedQuery.data

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const { supabase } = await getUserSession()
    if (!supabase) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const { data, error } = await supabase
      .from(SupabaseTable.SeriesBibles)
      .select(SupabaseColumn.BibleLockSelect)
      .eq(SupabaseColumn.ProjectId, projectId)
      .maybeSingle()

    if (error) {
      console.error(API_LOG_PREFIX.BIBLE_LOCK_FETCH_ERROR, error)
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
    console.error(API_LOG_PREFIX.BIBLE_LOCK_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_GET_BIBLE_LOCK_STATUS,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
