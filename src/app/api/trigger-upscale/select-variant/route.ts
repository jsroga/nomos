import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { selectMjVariantTask } from '@/trigger/select-mj-variant'
import { withAuth, verifyProjectAccess, type AuthenticatedRequest } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { tileId, projectId, gridImageUrl, variantIndex } = await request.json()

    if (!tileId || !projectId || !gridImageUrl || !variantIndex) {
      return NextResponse.json(
        { error: 'Missing: tileId, projectId, gridImageUrl, variantIndex' },
        { status: 400 }
      )
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const handle = await tasks.trigger<typeof selectMjVariantTask>(
      'select-mj-variant',
      { tileId, projectId, gridImageUrl, variantIndex },
      { ttl: '5m' }
    )

    return NextResponse.json({ success: true, runId: handle.id })
  }
)
