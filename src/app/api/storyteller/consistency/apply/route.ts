/**
 * Apply Consistency Fixes API
 *
 * POST /api/storyteller/consistency/apply
 *
 * Applies consistency fixes to story elements and records for undo.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  applyCascadingFixes,
  getUndoManager,
  type ConsistencyFix,
} from '@/domains/storyteller'
import { verifyProjectAccess } from '@/domains/storyteller'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { projectId, episodeId, fixes } = body as {
      projectId: string
      episodeId?: string
      fixes: ConsistencyFix[]
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    if (!fixes || fixes.length === 0) {
      return NextResponse.json({ error: 'Fixes array is required' }, { status: 400 })
    }

    console.log('[Apply Fixes API] Applying', fixes.length, 'fixes for project:', projectId)

    const result = await applyCascadingFixes(fixes, projectId, episodeId)

    const undoManager = getUndoManager()
    const undoId = undoManager.recordConsistencyFix(fixes, result.results)

    console.log('[Apply Fixes API] Applied', result.totalAffected, 'fixes successfully')

    return NextResponse.json({ ...result, undoId })
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
