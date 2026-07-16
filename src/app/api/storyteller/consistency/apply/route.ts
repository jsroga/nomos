/**
 * Apply Consistency Fixes API
 *
 * POST /api/storyteller/consistency/apply
 *
 * Applies consistency fixes to story elements and records for undo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readString, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { applyCascadingFixes } from '@/domains/storyteller/core/editing/cascade-editor'
import type { ConsistencyFix } from '@/domains/storyteller/core/types/consistency-types'
import { getUndoManager, verifyProjectAccess } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'
export const maxDuration = 30

function consistencyFixFromRow(value: unknown): ConsistencyFix | null {
  const row = recordFromJson(value)
  const id = readString(row.id)
  const inconsistencyId = readString(row.inconsistencyId)
  const target = recordFromJson(row.targetElement)
  const targetType = readString(target.type)
  const targetId = readString(target.id)
  if (!id || !inconsistencyId || !targetType || !targetId) return null

  const changes = recordArrayFromJson(row.changes).map(changeRow => {
    const change = recordFromJson(changeRow)
    return {
      path: readString(change.path) ?? '',
      before: change.before,
      after: change.after,
      reason: readString(change.reason) ?? '',
    }
  })

  return {
    id,
    inconsistencyId,
    targetElement: {
      type: targetType,
      id: targetId,
      name: readString(target.name),
    },
    changes,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = recordFromJson(await request.json())
    const projectId = readString(body.projectId)
    const episodeId = readString(body.episodeId)
    const fixRows = recordArrayFromJson(body.fixes)
    const fixes = fixRows
      .map(consistencyFixFromRow)
      .filter((fix): fix is ConsistencyFix => fix !== null)

    if (fixes.length === 0) {
      return NextResponse.json({ error: API_ERROR.FIXES_ARRAY_REQUIRED }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    console.log(
      API_LOG_PREFIX.APPLY_FIXES_APPLYING,
      fixes.length,
      API_LOG_PREFIX.APPLY_FIXES_FIXES_FOR,
      projectId
    )

    const result = await applyCascadingFixes(fixes, projectId, episodeId)

    const undoManager = getUndoManager()
    const undoId = undoManager.recordConsistencyFix(fixes, result.results)

    console.log(
      API_LOG_PREFIX.APPLY_FIXES_APPLIED,
      result.totalAffected,
      API_LOG_PREFIX.APPLY_FIXES_SUCCESS_SUFFIX
    )

    return NextResponse.json({ ...result, undoId })
  } catch (error) {
    console.error(API_LOG_PREFIX.APPLY_FIXES_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_APPLY_CONSISTENCY_FIXES,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
