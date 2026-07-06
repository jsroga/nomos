import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generate3DModelTask } from '@/trigger/generate-3d-model'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    // Use env API keys when client did not send one
    if (payload.provider === 'meshy' && !payload.apiKey && process.env.MESHY_API_KEY) {
      payload.apiKey = process.env.MESHY_API_KEY
    }
    if (payload.provider === 'hyper3d' && !payload.apiKey && process.env.HYPER3D_API_KEY) {
      payload.apiKey = process.env.HYPER3D_API_KEY
    }
    if (!payload.apiKey) {
      return NextResponse.json(
        { error: `No API key for ${payload.provider}. Set it in Settings or configure ${payload.provider === 'meshy' ? 'MESHY_API_KEY' : 'HYPER3D_API_KEY'} in env.` },
        { status: 400 }
      )
    }

    // Verify project access if projectId is provided
    if (payload.projectId) {
      const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }
    }

    const handle = await tasks.trigger<typeof generate3DModelTask>('generate-3d-model', payload, {
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
