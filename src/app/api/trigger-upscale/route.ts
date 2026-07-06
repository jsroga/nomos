import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { upscaleTileTask } from '@/trigger/upscale-tile'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
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
    if (!payload.tileId || !payload.projectId || !payload.imageBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId, projectId, imageBase64' },
        { status: 400 }
      )
    }

    const provider = payload.provider || 'stability'

    // Server-side key resolution
    const providerKeyMap: Record<string, string | undefined> = {
      stability: process.env.STABILITY_API_KEY,
      midjourney: process.env.LEGNEXT_API_KEY,
      replicate: process.env.REPLICATE_API_TOKEN,
    }
    const providerApiKey = providerKeyMap[provider]
    if (!providerApiKey) {
      return NextResponse.json(
        { error: `API key not configured on server for upscale provider: ${provider}` },
        { status: 500 }
      )
    }

    const skipGeminiPreUpscale = payload.skipGeminiPreUpscale ?? false
    const geminiApiKey = process.env.GOOGLE_API_KEY
    if (!skipGeminiPreUpscale && !geminiApiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY not configured on server (required for Gemini pre-upscale)' },
        { status: 500 }
      )
    }

    const providerConfig = {
      apiKey: providerApiKey,
      ...(payload.providerConfig?.model ? { model: payload.providerConfig.model } : {}),
      ...(payload.providerConfig?.upscaleMode ? { upscaleMode: payload.providerConfig.upscaleMode } : {}),
      ...(payload.providerConfig?.parameters ? { parameters: payload.providerConfig.parameters } : {}),
    }
    const geminiConfig = skipGeminiPreUpscale
      ? undefined
      : { apiKey: geminiApiKey!, model: 'gemini-3-pro-image-preview' }

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
        tileId: payload.tileId,
        projectId: payload.projectId,
        imageBase64: payload.imageBase64,
        prompt: payload.prompt,
        creativity: payload.creativity,
        provider,
        providerConfig,
        geminiConfig,
        skipGeminiPreUpscale,
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
