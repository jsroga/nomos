import { NextRequest, NextResponse } from 'next/server'
import { requireSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import type { generateTileTask } from '@/trigger'
import type { AuthenticatedRequest } from '@/shared/data/api-utils'
import { } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
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
  { session, supabase }: AuthenticatedRequest
): Promise<NextResponse> {
  const payload: TileRequestPayload = await request.json()

  const validationError = validateTileRequestPayload(payload)
  if (validationError) return validationError

  const requestId = requireSubmissionNonce(payload)
  if (requestId instanceof NextResponse) return requestId

  const scope = await tryProjectScope(payload.projectId, session.user.id)
  if (!scope) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
  }

  const providerResult = resolveTileAiProvider({
    isFirstTile: payload.isFirstTile ?? true,
    env: readTileProviderEnv(),
  })
  if (providerResult instanceof NextResponse) return providerResult

  const styleInputs = await resolveTileStyleInputs(supabase, payload)
  const taskPayload = buildGenerateTileTaskPayload(
    { ...payload, requestId },
    providerResult,
    styleInputs
  )

  const handle = await triggerOwnedRun<typeof generateTileTask>(
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
