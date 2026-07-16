import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/trigger'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls, resolveStyleContext } from '@/shared/data/constants/style-presets'
import { readString, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  resolveFollowUpImageProviderFromEnv,
  type TileAIProvider,
} from '@/trigger/providers/follow-up-provider'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { EnvVarName, GoogleModelId } from '@/shared/data/constants/protocol'
import { TileTriggerProvider } from '@/shared/data/constants/trigger-tile-route'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

/**
 * POST /api/trigger-tile
 * Trigger tile generation task
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (
      !payload.projectId ||
      payload.x === undefined ||
      payload.y === undefined ||
      payload.prompt === undefined
    ) {
      return NextResponse.json({ error: API_ERROR.MISSING_TILE_TRIGGER_FIELDS }, { status: 400 })
    }

    const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const isFirstTile = payload.isFirstTile ?? true

    const followUpProvider = resolveFollowUpImageProviderFromEnv()
    let aiProvider: TileAIProvider
    let aiConfig: Record<string, unknown>
    const hasLegNext = !!process.env.LEGNEXT_API_KEY
    const hasGoogle = !!process.env[EnvVarName.GoogleApiKey]

    if (!hasLegNext && !hasGoogle) {
      return NextResponse.json({ error: API_ERROR.NO_AI_PROVIDER_CONFIGURED }, { status: 500 })
    }

    if (isFirstTile) {
      if (hasLegNext) {
        aiProvider = TileTriggerProvider.Midjourney
        aiConfig = { apiKey: process.env.LEGNEXT_API_KEY }
      } else {
        aiProvider = TileTriggerProvider.Gemini
        aiConfig = {
          apiKey: process.env[EnvVarName.GoogleApiKey],
          model: GoogleModelId.Gemini3ProImagePreview,
        }
      }
    } else if (followUpProvider === TileTriggerProvider.LegnextUploadPaint && hasLegNext) {
      aiProvider = TileTriggerProvider.LegnextUploadPaint
      aiConfig = { apiKey: process.env.LEGNEXT_API_KEY }
    } else {
      if (!hasGoogle) {
        return NextResponse.json(
          { error: API_ERROR.GOOGLE_API_KEY_NOT_CONFIGURED_SERVER },
          { status: 500 }
        )
      }
      aiProvider = TileTriggerProvider.NanoBanana
      aiConfig = {
        apiKey: process.env[EnvVarName.GoogleApiKey],
        model: GoogleModelId.Gemini3ProImagePreview,
      }
    }

    const { data: projectData } = await supabase
      .from(DB_TABLE.PROJECTS)
      .select(DB_SELECT.PROJECT_STYLE_REFS)
      .eq(DB_COLUMN.ID, payload.projectId)
      .single()

    const styleContext = resolveStyleContext({
      stylePreset: readString(projectData?.style_preset) ?? null,
    })

    const styleReferenceUrls: string[] | undefined =
      payload.styleReferenceUrls && payload.styleReferenceUrls.length > 0
        ? payload.styleReferenceUrls
        : resolveStyleReferenceUrls({
            stylePreset: readString(projectData?.style_preset) ?? null,
            styleReferenceUrls: stringArrayFromJson(projectData?.style_reference_urls),
          })

    const handle = await tasks.trigger<typeof generateTileTask>(
      TRIGGER_TASK_ID.GENERATE_TILE,
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
        ttl: TRIGGER_TASK_TTL.GENERATE_TILE,
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 20, windowMs: 60000 }
)
