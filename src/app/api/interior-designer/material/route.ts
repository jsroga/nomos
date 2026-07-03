import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorMaterialRequestSchema,
  interiorMaterialResponseSchema,
  type InteriorMaterialResponse,
} from '@/domains/interior-designer/io/interior-designer.dto'
import type { surfaceMaterialTask } from '@/trigger/surface-material'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'

export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session, supabase }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorMaterialResponse | { error: string }>> => {
      const parsedBody = interiorMaterialRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { projectId, surfaceId, prompt, apiKey, artStyle, surfaceBounds } = parsedBody.data

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

      return NextResponse.json(
        interiorMaterialResponseSchema.parse({
          success: true,
          runId: handle.id,
          publicAccessToken: handle.publicAccessToken,
        })
      )
    }
  ),
  { maxRequests: 10, windowMs: 60000 }
)
