import { triggerOwnedRun } from '@/shared/jobs'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorTextTo3DRequestSchema,
  interiorTextTo3DResponseSchema,
  type InteriorTextTo3DResponse,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import type { textTo3DTask } from '@/trigger'
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
import { EnvVarName, MeshyArtStyle, MeshyTopology } from '@/shared/data/constants/protocol'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { supabase }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorTextTo3DResponse | { error: string }>> => {
      const parsedBody = interiorTextTo3DRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { projectId, prompt, seed, apiKey, artStyle, enablePbr, targetPolycount, topology } =
        parsedBody.data

      const hasAccess = await verifyProjectAccess(supabase, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
      }

      const meshyApiKey = apiKey || process.env[EnvVarName.MeshyApiKey]
      if (!meshyApiKey) {
        return NextResponse.json({ error: API_ERROR.MESHY_API_KEY_NOT_CONFIGURED }, { status: 400 })
      }

      const handle = await triggerOwnedRun<typeof textTo3DTask>(
        TRIGGER_TASK_ID.TEXT_TO_3D,
        {
          projectId,
          prompt,
          seed: seed || Math.floor(Math.random() * 2147483647),
          apiKey: meshyApiKey,
          artStyle: artStyle || MeshyArtStyle.Realistic,
          enablePbr: enablePbr !== false,
          targetPolycount: targetPolycount || 30000,
          topology: topology || MeshyTopology.Triangle,
        },
        { ttl: TRIGGER_TOKEN_EXPIRY }
      )

      return NextResponse.json(
        interiorTextTo3DResponseSchema.parse({
          success: true,
          runId: handle.id,
          publicAccessToken: handle.publicAccessToken,
        })
      )
    }
  ),
  { maxRequests: 5, windowMs: 60000 }
)
