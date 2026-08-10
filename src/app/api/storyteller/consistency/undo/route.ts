/**
 * Undo Consistency Fixes API
 *
 * POST /api/storyteller/consistency/undo
 *
 * Reverts previously applied consistency fixes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { getUndoManager, verifyProjectAccess } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const episodeId = readString(body.episodeId)
    const undoId = readString(body.undoId)

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const undoManager = getUndoManager()

    console.log(API_LOG_PREFIX.UNDO_API_UNDOING, projectId)

    let action
    if (undoId) {
      action = await undoManager.undoById(undoId, projectId, episodeId)
    } else {
      action = await undoManager.undo(projectId, episodeId)
    }

    if (!action) {
      return NextResponse.json({ error: API_ERROR.NO_ACTIONS_TO_UNDO }, { status: 404 })
    }

    console.log(API_LOG_PREFIX.UNDO_API_SUCCESS, action.id)

    return NextResponse.json({
      success: true,
      action,
      message: API_ERROR.CONSISTENCY_FIXES_REVERTED,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.UNDO_API_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_UNDO_CONSISTENCY_FIXES,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
