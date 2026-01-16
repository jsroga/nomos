import { NextRequest, NextResponse } from 'next/server'
import { uploadAssetTask } from '@/trigger/upload-asset'
import { withAuth, verifyProjectAccess, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
  const body = await request.json()
  const { projectId, assetId, modelFilename } = body

  if (!projectId || !assetId || !modelFilename) {
    return NextResponse.json(
      { error: 'Missing required fields: projectId, assetId, modelFilename' },
      { status: 400 }
    )
  }

  // Verify project access
  const hasAccess = await verifyProjectAccess(supabase, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
  }

  const handle = await uploadAssetTask.trigger({
    projectId,
    assetId,
    modelFilename,
  })

  return NextResponse.json({ runId: handle.id })
})
