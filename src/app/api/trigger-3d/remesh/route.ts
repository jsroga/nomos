import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { remesh3DModelTask } from '@/trigger'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session: _session }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.assetId || !payload.meshyTaskId) {
      return NextResponse.json({ error: API_ERROR.MISSING_REMESH_FIELDS }, { status: 400 })
    }
    if (!payload.apiKey && process.env.MESHY_API_KEY) {
      payload.apiKey = process.env.MESHY_API_KEY
    }
    if (!payload.apiKey) {
      return NextResponse.json({ error: API_ERROR.MESHY_API_KEY_MISSING }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof remesh3DModelTask>(
      TRIGGER_TASK_ID.REMESH_3D_MODEL,
      payload,
      {
        ttl: TRIGGER_TASK_TTL.REMESH,
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
