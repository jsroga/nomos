import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { upscaleTileTask } from '@/domains/world-building-toolkit/tasks/upscale-tile.task'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  GoogleModelId,
  TriggerTaskTtl,
} from '@/shared/data/constants/protocol'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { AIProvider } from '@/shared/types/enums'
import { JobType } from '@/shared/types/enums'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPSCALE_FIELDS }, { status: 400 })
    }

    const provider = payload.provider || AIProvider.Stability

    const providerKeyMap: Record<string, string | undefined> = {
      [AIProvider.Stability]: process.env.STABILITY_API_KEY,
      midjourney: process.env.LEGNEXT_API_KEY,
      [AIProvider.Replicate]: process.env.REPLICATE_API_TOKEN,
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
      return NextResponse.json({ error: API_ERROR.GOOGLE_API_KEY_GEMINI_PREUPSCALE }, { status: 500 })
    }

    const providerConfig = {
      apiKey: providerApiKey,
      ...(payload.providerConfig?.model ? { model: payload.providerConfig.model } : {}),
      ...(payload.providerConfig?.upscaleMode ? { upscaleMode: payload.providerConfig.upscaleMode } : {}),
      ...(payload.providerConfig?.parameters ? { parameters: payload.providerConfig.parameters } : {}),
    }
    const geminiConfig =
      skipGeminiPreUpscale || !geminiApiKey
        ? undefined
        : { apiKey: geminiApiKey, model: GoogleModelId.Gemini3ProImagePreview }

    const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    let styleReferenceUrls = payload.styleReferenceUrls
    if (!styleReferenceUrls) {
      const { data } = await supabase
        .from(DB_TABLE.PROJECTS)
        .select(DB_SELECT.PROJECT_STYLE_REFS)
        .eq(DB_COLUMN.ID, payload.projectId)
        .single()

      styleReferenceUrls = resolveStyleReferenceUrls({
        stylePreset: data?.style_preset,
        styleReferenceUrls: data?.style_reference_urls,
      })
    }

    const handle = await tasks.trigger<typeof upscaleTileTask>(
      JobType.UpscaleTile,
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
        ttl: TriggerTaskTtl.UpscaleTile,
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
