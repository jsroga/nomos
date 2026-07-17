import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateTileTask } from '@/trigger'
import type { AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/data/api-utils'
import { API_ERROR, TRIGGER_TASK_ID, TRIGGER_TASK_TTL } from '@/shared/data/constants/api-errors'
import { readTileProviderEnv, resolveTileAiProvider } from './trigger-tile-helpers'
import {
  buildGenerateTileTaskPayload,
  resolveTileStyleInputs,
  validateTileRequestPayload,
  type TileRequestPayload,
} from './trigger-tile-request-helpers'

export async function handleTriggerTileRequest(
  request: NextRequest,
  { supabase }: AuthenticatedRequest
): Promise<NextResponse> {
  const payload: TileRequestPayload = await request.json()

  const validationError = validateTileRequestPayload(payload)
  if (validationError) return validationError

  const hasAccess = await verifyProjectAccess(supabase, payload.projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
  }

  const providerResult = resolveTileAiProvider({
    isFirstTile: payload.isFirstTile ?? true,
    env: readTileProviderEnv(),
  })
  if (providerResult instanceof NextResponse) return providerResult

  const styleInputs = await resolveTileStyleInputs(supabase, payload)
  const taskPayload = buildGenerateTileTaskPayload(payload, providerResult, styleInputs)

  const handle = await tasks.trigger<typeof generateTileTask>(
    TRIGGER_TASK_ID.GENERATE_TILE,
    taskPayload,
    { ttl: TRIGGER_TASK_TTL.GENERATE_TILE }
  )

  return NextResponse.json({
    success: true,
    runId: handle.id,
    publicAccessToken: handle.publicAccessToken,
  })
}
