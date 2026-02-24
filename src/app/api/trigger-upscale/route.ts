import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { upscaleTileTask } from '@/trigger/upscale-tile'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'
import { resolveStyleReferenceUrls } from '@/config/style-presets'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trigger-upscale
 * Trigger tile upscale task
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    // Validate required fields
    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.provider) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId, projectId, imageBase64, provider' },
        { status: 400 }
      )
    }

    if (!payload.providerConfig?.apiKey) {
      return NextResponse.json({ error: 'Missing providerConfig.apiKey' }, { status: 400 })
    }

    // Gemini config is optional - only required if not skipping pre-upscale
    if (!payload.skipGeminiPreUpscale && !payload.geminiConfig?.apiKey) {
      return NextResponse.json(
        { error: 'Missing geminiConfig.apiKey - required unless skipGeminiPreUpscale is true' },
        { status: 400 }
      )
    }

    // Verify project access via RLS
    const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Fetch project style references using authenticated client (preset or custom URLs)
    let styleReferenceUrls = payload.styleReferenceUrls
    if (!styleReferenceUrls) {
      const { data } = await supabase
        .from('projects')
        .select('style_reference_urls, style_preset')
        .eq('id', payload.projectId)
        .single()

      styleReferenceUrls = resolveStyleReferenceUrls({
        stylePreset: data?.style_preset,
        styleReferenceUrls: data?.style_reference_urls,
      })
    }

    // Trigger the upscale task with style references
    const handle = await tasks.trigger<typeof upscaleTileTask>(
      'upscale-tile',
      {
        ...payload,
        styleReferenceUrls,
      },
      {
        ttl: '25m', // Slightly less than maxDuration to avoid race
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 10, windowMs: 60000 } // 10 upscales per minute
)
