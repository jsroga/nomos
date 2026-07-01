/**
 * Mark Entity Referenced API
 *
 * Updates the lastReferencedAt timestamp for an entity.
 * Used for tracking which entities are actively being used.
 */

import { NextRequest, NextResponse } from 'next/server'
import { entityRegistry } from '@/domains/storyteller'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withAuth(async (request: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    await entityRegistry.markReferenced(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Mark referenced failed:', error)
    return NextResponse.json({ error: 'Failed to mark referenced' }, { status: 500 })
  }
})
