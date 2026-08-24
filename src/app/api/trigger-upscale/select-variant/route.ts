import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
import type { selectMjVariantTask } from '@/trigger'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'

export const POST = withAuth(
  async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const { tileId, projectId, gridImageUrl, variantIndex } = await request.json()

    if (!tileId || !projectId || !gridImageUrl || !variantIndex) {
      return NextResponse.json({ error: API_ERROR.MISSING_VARIANT_FIELDS }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const handle = await triggerOwnedRun<typeof selectMjVariantTask>(
      TRIGGER_TASK_ID.SELECT_MJ_VARIANT,
      { tileId, projectId, gridImageUrl, variantIndex },
      { ttl: TRIGGER_TASK_TTL.SELECT_VARIANT }
    )

    return NextResponse.json({ success: true, runId: handle.id })
  }
)
