/**
 * Undo Consistency Fixes API
 *
 * POST /api/storyteller/consistency/undo
 *
 * Reverts previously applied consistency fixes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUndoManager } from '@/domains/storyteller/consistency/undo-manager'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { projectId, episodeId, undoId } = body as {
      projectId: string
      episodeId?: string
      undoId?: string
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const undoManager = getUndoManager()

    console.log('[Undo API] Undoing fixes for project:', projectId)

    let action

    if (undoId) {
      // Undo specific action by ID
      action = await undoManager.undoById(undoId, projectId, episodeId)
    } else {
      // Undo most recent action
      action = await undoManager.undo(projectId, episodeId)
    }

    if (!action) {
      return NextResponse.json({ error: 'No actions to undo' }, { status: 404 })
    }

    console.log('[Undo API] Successfully undid action:', action.id)

    return NextResponse.json({
      success: true,
      action,
      message: 'Consistency fixes reverted',
    })
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
