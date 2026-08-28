import { NextRequest, NextResponse } from 'next/server'
import type { uploadAssetTask } from '@/domains/storyteller/tasks/upload-asset.task'
import { requireSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'

export const POST = withAuth(
  async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, assetId, modelFilename } = body

    if (!projectId || !assetId || !modelFilename) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPLOAD_FIELDS }, { status: 400 })
    }

    const requestId = requireSubmissionNonce(body)
    if (requestId instanceof NextResponse) return requestId

    // Verify project access
    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Through triggerOwnedRun, not the task's own trigger: a run with no
    // project tag cannot be read back by its owner.
    const handle = await triggerOwnedRun<typeof uploadAssetTask>(TRIGGER_TASK_ID.UPLOAD_ASSET, {
      projectId: scope.projectId,
      requestId,
      assetId,
      modelFilename,
    })

    return NextResponse.json({ runId: handle.id })
  }
)
