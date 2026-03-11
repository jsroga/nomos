import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/trigger/generate-tile'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/lib/api-utils'
import { resolveStyleReferenceUrls, resolveStyleContext } from '@/config/style-presets'
import {
  resolveFollowUpImageProviderFromEnv,
  type TileAIProvider,
} from '@/trigger/providers/follow-up-provider'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trigger-tile
 * Trigger tile generation task
 */
export const POST = withRateLimit(
  withAuth<any>(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    // Validate required fields
    if (
      !payload.projectId ||
      payload.x === undefined ||
      payload.y === undefined ||
      payload.prompt === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, x, y, prompt' },
        { status: 400 }
      )
    }

    // Verify project access via RLS
    const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Determine if this is a first tile (no neighbors) or follow-up tile
    const isFirstTile = payload.isFirstTile ?? true

    const followUpProvider = resolveFollowUpImageProviderFromEnv()
    let aiProvider: TileAIProvider
    let aiConfig: Record<string, unknown>
    const hasLegNext = !!process.env.LEGNEXT_API_KEY
    const hasGoogle = !!process.env.GOOGLE_API_KEY

    if (!hasLegNext && !hasGoogle) {
      return NextResponse.json({ error: 'No AI provider configured (LEGNEXT_API_KEY or GOOGLE_API_KEY required)' }, { status: 500 })
    }

    if (isFirstTile) {
      if (hasLegNext) {
        aiProvider = 'midjourney'
        aiConfig = { apiKey: process.env.LEGNEXT_API_KEY }
      } else {
        // Fallback to Gemini
        aiProvider = 'gemini'
        aiConfig = { apiKey: process.env.GOOGLE_API_KEY, model: 'gemini-3-pro-image-preview' }
      }
    } else {
      if (followUpProvider === 'legnext-upload-paint' && hasLegNext) {
        aiProvider = 'legnext-upload-paint'
        aiConfig = { apiKey: process.env.LEGNEXT_API_KEY }
      } else {
        // Default follow-up provider: nano-banana (Gemini)
        if (!hasGoogle) {
          return NextResponse.json({ error: 'GOOGLE_API_KEY not configured on server' }, { status: 500 })
        }
        aiProvider = 'nano-banana'
        aiConfig = { apiKey: process.env.GOOGLE_API_KEY, model: 'gemini-3-pro-image-preview' }
      }
    }

    // Fetch style references and style context from project
    const { data: projectData } = await supabase
      .from('projects')
      .select('style_reference_urls, style_preset')
      .eq('id', payload.projectId)
      .single() as { data: { style_reference_urls: string[]; style_preset: string | null } | null }

    const styleContext = resolveStyleContext({ stylePreset: projectData?.style_preset })

    const styleReferenceUrls: string[] | undefined =
      payload.styleReferenceUrls && payload.styleReferenceUrls.length > 0
        ? payload.styleReferenceUrls
        : resolveStyleReferenceUrls({
            stylePreset: projectData?.style_preset,
            styleReferenceUrls: projectData?.style_reference_urls,
          })

    // Trigger the tile generation task
    const handle = await tasks.trigger<typeof generateTileTask>(
      'generate-tile',
      {
        projectId: payload.projectId,
        x: payload.x,
        y: payload.y,
        prompt: payload.prompt,
        aiProvider,
        aiConfig,
        isFirstTile,
        ...(styleReferenceUrls ? { styleReferenceUrls } : {}),
        ...(styleContext ? { styleContext } : {}),
        ...(payload.contextPayload ? { contextPayload: payload.contextPayload } : {}),
        ...(payload.contextImageBase64 ? { contextImageBase64: payload.contextImageBase64 } : {}),
      },
      {
        ttl: '10m', // Match maxDuration
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 20, windowMs: 60000 } // 20 tile generations per minute
)
