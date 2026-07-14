import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generate3DModelTask } from '@/trigger'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { EnvVarName, ModelProvider } from '@/shared/data/constants/protocol'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
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

    // Verify project access if projectId is provided
    if (payload.projectId) {
      const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }
    }

    const handle = await tasks.trigger<typeof generate3DModelTask>(
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
