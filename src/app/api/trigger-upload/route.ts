import { NextRequest, NextResponse } from 'next/server'
import { uploadAssetTask } from '@/domains/storyteller/tasks/upload-asset.task'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'

export const POST = withAuth<{ runId: string } | { error: string }>(
  async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, assetId, modelFilename } = body

    if (!projectId || !assetId || !modelFilename) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPLOAD_FIELDS }, { status: 400 })
    }

    // Verify project access
    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const handle = await uploadAssetTask.trigger({
      projectId: scope.projectId,
      assetId,
      modelFilename,
    })

    return NextResponse.json({ runId: handle.id })
  }
)
