import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { enhanceFidelityTask } from '@/trigger'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_SELECT, DB_TABLE } from '@/shared/data/constants/db-tables'
import { EnvVarName, GoogleModelId } from '@/shared/data/constants/protocol'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'

/**
 * POST /api/trigger-fidelity
 * Trigger fidelity enhancement task
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.stylePrompt) {
      return NextResponse.json({ error: API_ERROR.FIDELITY_FIELDS_REQUIRED }, { status: 400 })
    }

    // Server-side key resolution
    if (!process.env[EnvVarName.GoogleApiKey]) {
      return NextResponse.json(
        { error: API_ERROR.GOOGLE_API_KEY_NOT_CONFIGURED_FIDELITY },
        { status: 500 }
      )
    }

    const geminiConfig = {
      apiKey: process.env[EnvVarName.GoogleApiKey],
      model: GoogleModelId.Gemini3ProImagePreview,
    }

    // Verify project access via RLS
    const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Fetch project style references using authenticated client (preset or custom URLs)
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

    const handle = await tasks.trigger<typeof enhanceFidelityTask>(
      TRIGGER_TASK_ID.ENHANCE_FIDELITY,
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
        ttl: TRIGGER_TASK_TTL.FIDELITY,
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
