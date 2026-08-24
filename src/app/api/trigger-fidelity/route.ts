import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
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
import { readApiframeApiKey } from '@/shared/ai/image-model-env'

/**
 * POST /api/trigger-fidelity
 * Trigger fidelity enhancement task (Topaz via Apiframe)
 */
export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.tileId || !payload.projectId || !payload.imageBase64 || !payload.stylePrompt) {
      return NextResponse.json({ error: API_ERROR.FIDELITY_FIELDS_REQUIRED }, { status: 400 })
    }

    if (!readApiframeApiKey()) {
      return NextResponse.json(
        { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
        { status: 500 }
      )
    }

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

    const handle = await triggerOwnedRun<typeof enhanceFidelityTask>(
      TRIGGER_TASK_ID.ENHANCE_FIDELITY,
      {
        tileId: payload.tileId,
        projectId: payload.projectId,
        imageBase64: payload.imageBase64,
        stylePrompt: payload.stylePrompt,
        creativity: payload.creativity || 0.3,
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
  { maxRequests: 15, windowMs: 60000 }
)
