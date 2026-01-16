/**
 * Apply Consistency Fixes API
 *
 * POST /api/storyteller/consistency/apply
 *
 * Applies consistency fixes to story elements and records for undo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { applyCascadingFixes } from '@/domains/storyteller/consistency/cascade-editor'
import { getUndoManager } from '@/domains/storyteller/consistency/undo-manager'
import { ConsistencyFix } from '@/domains/storyteller/consistency/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { projectId, episodeId, fixes } = body as {
      projectId: string
      episodeId?: string
      fixes: ConsistencyFix[]
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!fixes || fixes.length === 0) {
      return NextResponse.json({ error: 'Fixes array is required' }, { status: 400 })
    }

    console.log('[Apply Fixes API] Applying', fixes.length, 'fixes for project:', projectId)

    // Apply fixes
    const result = await applyCascadingFixes(fixes, projectId, episodeId)

    // Record for undo
    const undoManager = getUndoManager()
    const undoId = undoManager.recordConsistencyFix(fixes, result.results)

    console.log('[Apply Fixes API] Applied', result.totalAffected, 'fixes successfully')

    return NextResponse.json({
      ...result,
      undoId,
    })
  } catch (error) {
    console.error('[Apply Fixes API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to apply consistency fixes',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
