/**
 * Mark Entity Referenced API
 *
 * Updates the lastReferencedAt timestamp for an entity.
 * Used for tracking which entities are actively being used.
 */

import { NextRequest, NextResponse } from 'next/server'
import { entityRegistry } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get(DB_COLUMN.ID)

    if (!id) {
      return NextResponse.json({ error: API_ERROR.MISSING_ID }, { status: 400 })
    }

    await entityRegistry.markReferenced(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.MARK_REFERENCED_FAILED, error)
    return NextResponse.json({ error: API_ERROR.FAILED_MARK_REFERENCED }, { status: 500 })
  }
})
