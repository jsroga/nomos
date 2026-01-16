import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { remesh3DModelTask } from '@/trigger/remesh-3d-model'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.assetId || !payload.meshyTaskId || !payload.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, meshyTaskId, apiKey' },
        { status: 400 }
      )
    }

    const handle = await tasks.trigger<typeof remesh3DModelTask>('remesh-3d-model', payload, {
      ttl: '30m',
    })

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 5, windowMs: 60000 }
)
