import { retextureModelTask } from '@/trigger/retexture-model'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  interiorRetextureRequestSchema,
  interiorRetextureResponseSchema,
  type InteriorRetextureResponse,
} from '@/domains/interior-designer/io/interior-designer.dto'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

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

      if (projectId !== 'default') {
        const hasAccess = await verifyProjectAccess(supabase, projectId)
        if (!hasAccess) {
          return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
        }
      }

      let styleImageUrl: string | undefined
      if (projectId !== 'default') {
        const { data } = await supabase
          .from('projects')
          .select('style_reference_urls')
          .eq('id', projectId)
          .single()

        const projectData = data as { style_reference_urls?: string[] } | null
        const styleReferenceUrls = Array.isArray(projectData?.style_reference_urls)
          ? projectData.style_reference_urls
          : []

        if (styleReferenceUrls.length > 0) {
          try {
            const response = await fetch(styleReferenceUrls[0], {
              method: 'HEAD',
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

      const meshyApiKey = apiKey || process.env.MESHY_API_KEY
      if (!meshyApiKey) {
        return NextResponse.json({ error: 'Meshy API key not configured' }, { status: 400 })
      }

      const handle = await tasks.trigger<typeof retextureModelTask>('retexture-model', {
        modelBase64: modelUrlOrBase64,
        prompt,
        assetId: assetId || 'temp-asset',
        projectId,
        apiKey: meshyApiKey,
        styleImageUrl,
      })

      return NextResponse.json(interiorRetextureResponseSchema.parse({ runId: handle.id }))
    }
  ),
  { maxRequests: 5, windowMs: 60000 }
)
