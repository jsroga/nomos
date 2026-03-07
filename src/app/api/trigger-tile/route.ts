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

    // Server-side provider resolution: first tile = midjourney, follow-up = nano-banana
    let aiProvider: string
    let aiConfig: Record<string, unknown>
    if (isFirstTile) {
      if (!process.env.LEGNEXT_API_KEY) {
        return NextResponse.json({ error: 'LEGNEXT_API_KEY not configured on server' }, { status: 500 })
      }
      aiProvider = 'midjourney'
      aiConfig = { apiKey: process.env.LEGNEXT_API_KEY }
    } else {
      if (!process.env.GOOGLE_API_KEY) {
        return NextResponse.json({ error: 'GOOGLE_API_KEY not configured on server' }, { status: 500 })
      }
      aiProvider = 'nano-banana'
      aiConfig = { apiKey: process.env.GOOGLE_API_KEY, model: 'gemini-3-pro-image-preview' }
    }

    // Fetch style references and style context (preset or custom) for first tile
    let styleReferenceUrls: string[] | undefined
    let styleContext: string | undefined
    if (isFirstTile) {
      const { data } = await supabase
        .from('projects')
        .select('style_reference_urls, style_preset')
        .eq('id', payload.projectId)
        .single() as { data: { style_reference_urls: string[]; style_preset: string | null } | null }

      styleReferenceUrls =
        payload.styleReferenceUrls && payload.styleReferenceUrls.length > 0
          ? payload.styleReferenceUrls
          : resolveStyleReferenceUrls({
              stylePreset: data?.style_preset,
              styleReferenceUrls: data?.style_reference_urls,
            })
      styleContext = resolveStyleContext({ stylePreset: data?.style_preset })
    }

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
        // Only pass style refs and context for first tile
        ...(styleReferenceUrls ? { styleReferenceUrls } : {}),
        ...(styleContext !== undefined ? { styleContext } : {}),
        // Pass context image for follow-up tiles
        ...(payload.contextImageBase64 ? { contextImageBase64: payload.contextImageBase64 } : {}),
        // Pass neighbors for server-side context assembly
        ...(!isFirstTile && payload.neighbors ? { neighbors: payload.neighbors } : {}),
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
