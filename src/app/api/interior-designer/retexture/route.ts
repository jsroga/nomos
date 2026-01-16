import { retextureModelTask } from '@/trigger/retexture-model'
import { tasks } from '@trigger.dev/sdk/v3'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRateLimit, verifyProjectAccess, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { modelUrlOrBase64, prompt, assetId, projectId, apiKey } = await request.json()

    if (!modelUrlOrBase64 || !prompt || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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

      const styleReferenceUrls = (data?.style_reference_urls as string[]) || []
      
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

    const handle = await tasks.trigger<typeof retextureModelTask>('retexture-model', {
      modelBase64: modelUrlOrBase64,
      prompt,
      assetId: assetId || 'temp-asset',
      projectId,
      apiKey: apiKey || process.env.MESHY_API_KEY,
      styleImageUrl,
    })

    return NextResponse.json({ runId: handle.id })
  }),
  { maxRequests: 5, windowMs: 60000 }
)
