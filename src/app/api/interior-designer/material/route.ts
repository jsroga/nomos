import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import type { surfaceMaterialTask } from '@/trigger/surface-material'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, surfaceId, prompt, apiKey, artStyle, surfaceBounds } = body

    if (!projectId || !surfaceId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, surfaceId, and prompt' },
        { status: 400 }
      )
    }

    // Verify project access via RLS
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const meshyApiKey = apiKey || process.env.MESHY_API_KEY
    if (!meshyApiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof surfaceMaterialTask>(
      'surface-material',
      {
        projectId,
        surfaceId,
        prompt,
        apiKey: meshyApiKey,
        artStyle: artStyle || 'realistic',
        surfaceBounds,
      },
      { ttl: '1h' }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
