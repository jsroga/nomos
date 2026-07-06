import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { enhanceFidelityTask } from '@/trigger/enhance-fidelity'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trigger-fidelity
 * Trigger fidelity enhancement task
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.stylePrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: tileId, projectId, imageBase64, stylePrompt' },
        { status: 400 }
      )
    }

    // Server-side key resolution
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY not configured on server (required for fidelity enhancement)' },
        { status: 500 }
      )
    }

    const geminiConfig = {
      apiKey: process.env.GOOGLE_API_KEY,
      model: 'gemini-3-pro-image-preview',
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

    const handle = await tasks.trigger<typeof enhanceFidelityTask>(
      'enhance-fidelity',
      {
        tileId: payload.tileId,
        projectId: payload.projectId,
        imageBase64: payload.imageBase64,
        stylePrompt: payload.stylePrompt,
        creativity: payload.creativity || 0.3,
        geminiConfig,
        styleReferenceUrls,
      },
      {
        ttl: '10m',
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 15, windowMs: 60000 } // 15 fidelity enhancements per minute
)
