import { NextRequest, NextResponse } from 'next/server'
import { uploadAssetTask } from '@/domains/storyteller/tasks/upload-asset.task'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { withAuth, verifyProjectAccess, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth<{ runId: string } | { error: string }>(
  async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, assetId, modelFilename } = body

    if (!projectId || !assetId || !modelFilename) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPLOAD_FIELDS }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const handle = await uploadAssetTask.trigger({
      projectId,
      assetId,
      modelFilename,
    })

    return NextResponse.json({ runId: handle.id })
  }
)
