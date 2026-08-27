import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import type { remesh3DModelTask } from '@/trigger'
import { db } from '@/db/client'
import { assets } from '@/db/schema'
import {
  API_ERROR,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { triggerOwnedRun } from '@/shared/jobs'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const payload = await request.json()

    if (!payload.assetId || !payload.meshyTaskId) {
      return NextResponse.json({ error: API_ERROR.MISSING_REMESH_FIELDS }, { status: 400 })
    }
    if (!payload.apiKey && process.env.MESHY_API_KEY) {
      payload.apiKey = process.env.MESHY_API_KEY
    }
    if (!payload.apiKey) {
      return NextResponse.json({ error: API_ERROR.MESHY_API_KEY_MISSING }, { status: 400 })
    }

    // The payload carries no project, so resolve it from the asset — which is
    // also the ownership check this route never had: any signed-in caller could
    // remesh any asset by id.
    const [asset] = await db
      .select({ projectId: assets.projectId })
      .from(assets)
      .where(eq(assets.id, payload.assetId))
      .limit(1)

    const scope = asset ? await tryProjectScope(asset.projectId, session.user.id) : null
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.ASSET_NOT_FOUND }, { status: 404 })
    }

    const handle = await triggerOwnedRun<typeof remesh3DModelTask>(
      TRIGGER_TASK_ID.REMESH_3D_MODEL,
      { ...payload, projectId: scope.projectId },
      {
        ttl: TRIGGER_TASK_TTL.REMESH,
      }
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  }),
  { maxRequests: 5, windowMs: 60000 }
)
