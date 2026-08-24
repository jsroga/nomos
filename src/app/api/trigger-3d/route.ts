import { NextRequest, NextResponse } from 'next/server'
import type { generate3DModelTask } from '@/trigger'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { EnvVarName, ModelProvider } from '@/shared/data/constants/protocol'
import { triggerOwnedRun } from '@/shared/jobs'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const payload = await request.json()

    // Use env API keys when client did not send one
    if (payload.provider === ModelProvider.Meshy && !payload.apiKey && process.env[EnvVarName.MeshyApiKey]) {
      payload.apiKey = process.env[EnvVarName.MeshyApiKey]
    }
    if (
      payload.provider === ModelProvider.Hyper3d &&
      !payload.apiKey &&
      process.env[EnvVarName.Hyper3dApiKey]
    ) {
      payload.apiKey = process.env[EnvVarName.Hyper3dApiKey]
    }
    if (!payload.apiKey) {
      return NextResponse.json(
        {
          error: `No API key for ${payload.provider}. Set it in Settings or configure ${payload.provider === ModelProvider.Meshy ? EnvVarName.MeshyApiKey : EnvVarName.Hyper3dApiKey} in env.`,
        },
        { status: 400 }
      )
    }

    // A run without a project cannot be tagged, and an untagged run cannot be
    // read back by anyone — so projectId is required rather than optional.
    if (!payload.projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: 400 })
    }
    const hasAccess = await verifyProjectAccess(payload.projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const handle = await triggerOwnedRun<typeof generate3DModelTask>(
      TRIGGER_TASK_ID.GENERATE_3D_MODEL,
      payload,
      {
        ttl: TRIGGER_TASK_TTL.GENERATE_3D,
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 5, windowMs: 60000 }
)
