import { retextureModelTask } from '@/trigger/retexture-model'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import {
  retextureRequestSchema,
  retextureStartResponseSchema,
} from '@/domains/interior-designer/io/interior-designer.dto'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth<Record<string, unknown>>(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const parsedBody = retextureRequestSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid retexture payload' }, { status: 400 })
    }

    const { modelUrlOrBase64, prompt, assetId, projectId, apiKey } = parsedBody.data

    // Verify project access via RLS
    if (projectId !== 'default') {
      const hasAccess = await verifyProjectAccess(supabase, projectId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }
    }

    // Fetch style reference URLs using authenticated client
    let styleImageUrl: string | undefined
    if (projectId !== 'default') {
      const { data } = await supabase
        .from('projects')
        .select('style_reference_urls')
        .eq('id', projectId)
        .single()

      const projectRow = data as { style_reference_urls?: string[] | null } | null
      const styleReferenceUrls = projectRow?.style_reference_urls ?? []

      if (styleReferenceUrls.length > 0) {
        // Validate first URL is accessible
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

    return NextResponse.json(retextureStartResponseSchema.parse({ runId: handle.id }))
  }),
  { maxRequests: 5, windowMs: 60000 }
)
