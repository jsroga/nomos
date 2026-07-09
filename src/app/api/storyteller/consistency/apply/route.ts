/**
 * Apply Consistency Fixes API
 *
 * POST /api/storyteller/consistency/apply
 *
 * Applies consistency fixes to story elements and records for undo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPlainObject, readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { applyCascadingFixes } from '@/domains/storyteller/core/editing/CascadeEditor'
import type { ConsistencyFix } from '@/domains/storyteller/core/types/ConsistencyTypes'
import { getUndoManager, verifyProjectAccess } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

function isConsistencyFix(value: unknown): value is ConsistencyFix {
  const row = recordFromJson(value)
  const target = recordFromJson(row.targetElement)
  return (
    typeof row.id === 'string' &&
    typeof row.inconsistencyId === 'string' &&
    typeof target.type === 'string' &&
    typeof target.id === 'string' &&
    Array.isArray(row.changes)
  )
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const episodeId = readString(body.episodeId)
    const fixRows = recordArrayFromJson(body.fixes)
    const fixes: ConsistencyFix[] = fixRows.filter(isConsistencyFix)

    if (fixes.length === 0) {
      return NextResponse.json({ error: 'Fixes array is required' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
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
