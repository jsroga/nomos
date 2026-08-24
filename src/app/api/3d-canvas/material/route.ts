import { triggerOwnedRun } from '@/shared/jobs'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorMaterialRequestSchema,
  interiorMaterialResponseSchema,
  type InteriorMaterialResponse,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import type { surfaceMaterialTask } from '@/trigger'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TOKEN_EXPIRY,
} from '@/shared/data/constants/api-errors'
import { EnvVarName, MeshyArtStyle } from '@/shared/data/constants/protocol'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { supabase }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorMaterialResponse | { error: string }>> => {
      const parsedBody = interiorMaterialRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { projectId, surfaceId, prompt, apiKey, artStyle, surfaceBounds } = parsedBody.data

      const hasAccess = await verifyProjectAccess(supabase, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }

      const meshyApiKey = apiKey || process.env[EnvVarName.MeshyApiKey]
      if (!meshyApiKey) {
        return NextResponse.json({ error: API_ERROR.MESHY_API_KEY_NOT_CONFIGURED }, { status: 400 })
      }

      const handle = await triggerOwnedRun<typeof surfaceMaterialTask>(
        TRIGGER_TASK_ID.SURFACE_MATERIAL,
        {
          projectId,
          surfaceId,
          prompt,
          apiKey: meshyApiKey,
          artStyle: artStyle || MeshyArtStyle.Realistic,
          surfaceBounds,
        },
        { ttl: TRIGGER_TOKEN_EXPIRY }
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
