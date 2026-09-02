/**
 * Mark Entity Referenced API
 *
 * Updates the lastReferencedAt timestamp for an entity.
 * Used for tracking which entities are actively being used.
 */

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { entityReferences } from '@/db'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { entityRegistry } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get(DB_COLUMN.ID)

    if (!id) {
      return NextResponse.json({ error: API_ERROR.MISSING_ID }, { status: 400 })
    }

    // entityRegistry writes through Drizzle, which bypasses RLS, so ownership
    // is checked here rather than assumed from the session.
    const [reference] = await db
      .select({ projectId: entityReferences.projectId })
      .from(entityReferences)
      .where(eq(entityReferences.id, id))
      .limit(1)

    const scope = reference ? await tryProjectScope(reference.projectId, session.user.id) : null
    if (!scope) {
      return NextResponse.json(
        { error: API_ERROR.ENTITY_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    await entityRegistry.markReferenced(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.MARK_REFERENCED_FAILED, error)
    return NextResponse.json({ error: API_ERROR.FAILED_MARK_REFERENCED }, { status: 500 })
  }
})
