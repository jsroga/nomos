import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
import type { upscaleTileTask } from '@/domains/2d-canvas/tasks/upscale-tile.task'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { TriggerTaskTtl } from '@/shared/data/constants/protocol'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { JobType } from '@/shared/types/enums'
import { readString } from '@/shared/data/json-guards'
import {
  generationModeDef,
  resolveGenerationMode,
} from '@/domains/2d-canvas/constants/generation-modes'
import { UpscaleProvider } from '@/domains/2d-canvas/core/upscale-provider-wire'
import {
  buildUpscaleProviderConfig,
  isUpscaleMode,
  resolveModeUpscaleAuth,
} from './trigger-upscale-helpers'
import type { ProviderConfig } from '@/domains/2d-canvas/tasks/upscale-tile-providers'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64) {
      return NextResponse.json({ error: API_ERROR.MISSING_UPSCALE_FIELDS }, { status: 400 })
    }

    const scope = await tryProjectScope(payload.projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const { data } = await supabase
      .from(DB_TABLE.PROJECTS)
      .select(DB_SELECT.PROJECT_STYLE_REFS)
      .eq(DB_COLUMN.ID, scope.projectId)
      .single()

    const mode = generationModeDef(resolveGenerationMode(data?.generation_mode))
    const auth = resolveModeUpscaleAuth(mode.upscaleStrategy)
    if (auth instanceof NextResponse) return auth

    const styleReferenceUrls =
      payload.styleReferenceUrls ??
      resolveStyleReferenceUrls({
        stylePreset: readString(data?.style_preset),
        styleReferenceUrls: data?.style_reference_urls,
      })

    const provider = UpscaleProvider.Stability
    const rawProviderConfig = buildUpscaleProviderConfig(payload, auth.providerApiKey)
    const providerConfig: ProviderConfig = {
      apiKey: rawProviderConfig.apiKey,
      ...(typeof rawProviderConfig.model === 'string' ? { model: rawProviderConfig.model } : {}),
      ...(isUpscaleMode(rawProviderConfig.upscaleMode)
        ? { upscaleMode: rawProviderConfig.upscaleMode }
        : {}),
    }

    const handle = await triggerOwnedRun<typeof upscaleTileTask>(
      JobType.UpscaleTile,
      {
        tileId: payload.tileId,
        projectId: scope.projectId,
        imageBase64: payload.imageBase64,
        prompt: payload.prompt,
        creativity: payload.creativity,
        provider,
        providerConfig,
        styleReferenceUrls,
        upscaleStrategy: mode.upscaleStrategy,
        ...(auth.geminiConfig ? { geminiConfig: auth.geminiConfig } : {}),
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
