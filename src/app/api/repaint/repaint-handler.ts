import { NextRequest, NextResponse } from 'next/server'
import { requireSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import type { repaintTileTask } from '@/trigger'
import type { AuthenticatedRequest } from '@/shared/data/api-utils'
import { } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import {
  API_ERROR,
  API_LOG_PREFIX,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { readApiframeApiKey } from '@/shared/ai/image-model-env'
import { getErrorMessage } from '@/shared/errors/error-utils'

export async function handleRepaintRequest(
  request: NextRequest,
  { session }: AuthenticatedRequest,
): Promise<NextResponse> {
  const body = recordFromJson(await request.json())
  const projectId = readString(body.projectId)
  const base64Image = readString(body.base64Image)
  const maskBase64 = readString(body.maskBase64)
  const prompt = readString(body.prompt)
  const styleReferenceUrls = stringArrayFromJson(body.styleReferenceUrls)

  if (!projectId || !base64Image || !maskBase64) {
    return NextResponse.json({ error: API_ERROR.MISSING_REPAINT_FIELDS }, { status: 400 })
  }

  const requestId = requireSubmissionNonce(body)
  if (requestId instanceof NextResponse) return requestId

  const scope = await tryProjectScope(projectId, session.user.id)
  if (!scope) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
  }

  if (!readApiframeApiKey()) {
    return NextResponse.json(
      { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
      { status: 500 },
    )
  }

  try {
    const handle = await triggerOwnedRun<typeof repaintTileTask>(
      TRIGGER_TASK_ID.REPAINT_TILE,
      {
        projectId: scope.projectId,
        requestId,
        base64Image,
        maskBase64,
        ...(prompt ? { prompt } : {}),
        ...(styleReferenceUrls.length ? { styleReferenceUrls } : {}),
      },
      { ttl: TRIGGER_TASK_TTL.REPAINT },
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.REPAINT_TRIGGER_ERROR, getErrorMessage(error))
    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.REPAINT_TRIGGER_FAILED },
      { status: 502 },
    )
  }
}
