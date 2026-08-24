import { retextureModelTask } from '@/trigger'
import { triggerOwnedRun } from '@/shared/jobs'
import { NextRequest, NextResponse } from 'next/server'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  interiorRetextureRequestSchema,
  interiorRetextureResponseSchema,
  type InteriorRetextureResponse,
} from '@/domains/3d-canvas/core/io/interior-designer.dto'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { EnvVarName, HttpMethod } from '@/shared/data/constants/protocol'
import {
  InteriorDefaultProjectId,
  InteriorTempAssetId,
} from '@/domains/3d-canvas/constants/interior-api-defaults'

export const POST = withRateLimit(
  withAuth(
    async (
      request: NextRequest,
      { session, supabase }: AuthenticatedRequest
    ): Promise<NextResponse<InteriorRetextureResponse | { error: string }>> => {
      const parsedBody = interiorRetextureRequestSchema.safeParse(await request.json())
      if (!parsedBody.success) {
        return NextResponse.json({ error: parsedBody.error.issues[0]?.message }, { status: 400 })
      }

      const { modelUrlOrBase64, prompt, assetId, projectId, apiKey } = parsedBody.data

      if (projectId !== InteriorDefaultProjectId.Default) {
        const hasAccess = await verifyProjectAccess(projectId, session.user.id)
        if (!hasAccess) {
          return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
        }
      }

      let styleImageUrl: string | undefined
      if (projectId !== InteriorDefaultProjectId.Default) {
        const { data } = await supabase
          .from(DB_TABLE.PROJECTS)
          .select(DB_COLUMN.STYLE_REFERENCE_URLS)
          .eq(DB_COLUMN.ID, projectId)
          .single()

        const projectRecord = recordFromJson(data)
        const styleReferenceUrls = stringArrayFromJson(projectRecord.style_reference_urls)

        if (styleReferenceUrls.length > 0) {
          try {
            const response = await fetch(styleReferenceUrls[0], {
              method: HttpMethod.Head,
              signal: AbortSignal.timeout(5000),
            })
            if (response.ok) {
              styleImageUrl = styleReferenceUrls[0]
            }
          } catch {
            // Style URL not accessible, skip
          }
        }
      }

      const meshyApiKey = apiKey || process.env[EnvVarName.MeshyApiKey]
      if (!meshyApiKey) {
        return NextResponse.json({ error: API_ERROR.MESHY_API_KEY_NOT_CONFIGURED }, { status: 400 })
      }

      const handle = await triggerOwnedRun<typeof retextureModelTask>(TRIGGER_TASK_ID.RETEXTURE_MODEL, {
        modelBase64: modelUrlOrBase64,
        prompt,
        assetId: assetId || InteriorTempAssetId.TempAsset,
        projectId,
        apiKey: meshyApiKey,
        styleImageUrl,
      })

      return NextResponse.json(interiorRetextureResponseSchema.parse({ runId: handle.id }))
    }
  ),
  { maxRequests: 5, windowMs: 60000 }
)
