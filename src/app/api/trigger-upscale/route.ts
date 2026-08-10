import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { upscaleTileTask } from '@/domains/2d-canvas/tasks/upscale-tile.task'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { TriggerTaskTtl } from '@/shared/data/constants/protocol'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { AIProvider } from '@/shared/types/enums'
import { JobType } from '@/shared/types/enums'
import {
  buildUpscaleProviderConfig,
  isUpscaleMode,
  validateUpscaleProvider,
} from './trigger-upscale-helpers'
import type { ProviderConfig } from '@/domains/2d-canvas/tasks/upscale-tile-providers'
import { resolveDefaultUpscaleProvider } from '@/shared/ai/image-model-env'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPSCALE_FIELDS }, { status: 400 })
    }

    const provider = payload.provider || resolveDefaultUpscaleProvider() || AIProvider.Stability
    const providerResult = validateUpscaleProvider(provider)
    if (providerResult instanceof NextResponse) return providerResult

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

    const rawProviderConfig = buildUpscaleProviderConfig(payload, providerResult.providerApiKey)
    const providerConfig: ProviderConfig = {
      apiKey: rawProviderConfig.apiKey,
      ...(typeof rawProviderConfig.model === 'string' ? { model: rawProviderConfig.model } : {}),
      ...(isUpscaleMode(rawProviderConfig.upscaleMode)
        ? { upscaleMode: rawProviderConfig.upscaleMode }
        : {}),
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
        styleReferenceUrls,
      },
      { ttl: TriggerTaskTtl.UpscaleTile }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
