import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  textTo3DRequestSchema,
  textTo3DStartResponseSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'
import type { textTo3DTask } from '@/trigger/text-to-3d'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth<Record<string, unknown>>(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const parsedBody = textTo3DRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid text-to-3d payload' }, { status: 400 })
    }

    const { projectId, prompt, seed, apiKey, artStyle, enablePbr, targetPolycount, topology } =
      parsedBody.data

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const meshyApiKey = apiKey || process.env.MESHY_API_KEY
    if (!meshyApiKey) {
      return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 400 })
    }

    const handle = await tasks.trigger<typeof textTo3DTask>(
      'text-to-3d',
      {
        projectId,
        prompt,
        seed: seed || Math.floor(Math.random() * 2147483647),
        apiKey: meshyApiKey,
        artStyle: artStyle || 'realistic',
        enablePbr: enablePbr !== false,
        targetPolycount: targetPolycount || 30000,
        topology: topology || 'triangle',
      },
      { ttl: '1h' }
    )

    return NextResponse.json(textTo3DStartResponseSchema.parse({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    }))
  }),
  { maxRequests: 5, windowMs: 60000 }
)
