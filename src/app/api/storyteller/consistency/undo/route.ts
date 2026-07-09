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

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const episodeId = readString(body.episodeId)
    const undoId = readString(body.undoId)

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const undoManager = getUndoManager()

    console.log('[Undo API] Undoing fixes for project:', projectId)

    let action
    if (undoId) {
      action = await undoManager.undoById(undoId, projectId, episodeId)
    } else {
      action = await undoManager.undo(projectId, episodeId)
    }

    if (!action) {
      return NextResponse.json({ error: 'No actions to undo' }, { status: 404 })
    }

    console.log('[Undo API] Successfully undid action:', action.id)

    return NextResponse.json({ success: true, action, message: 'Consistency fixes reverted' })
  } catch (error) {
    console.error('[Undo API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to undo consistency fixes',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
