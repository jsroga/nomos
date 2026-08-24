import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
import type { segmentObjectTask } from '@/trigger'
import type { AuthenticatedRequest } from '@/shared/data/api-utils'
import { } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import {
  API_ERROR,
  API_LOG_PREFIX,
  TRIGGER_TASK_ID,
  TRIGGER_TASK_TTL,
} from '@/shared/data/constants/api-errors'
import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import { readFalApiKey, resolveSamPrompt } from '@/shared/ai/constants/fal'
import { getErrorMessage } from '@/shared/errors/error-utils'

function readSelectBox(value: unknown): {
  x1: number
  y1: number
  x2: number
  y2: number
} | null {
  const record = recordFromJson(value)
  const x1 = readNumber(record.x1)
  const y1 = readNumber(record.y1)
  const x2 = readNumber(record.x2)
  const y2 = readNumber(record.y2)
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null
  return { x1, y1, x2, y2 }
}

export async function handleSegmentRequest(
  request: NextRequest,
  { session }: AuthenticatedRequest,
): Promise<NextResponse> {
  const body = recordFromJson(await request.json())
  const projectId = readString(body.projectId)
  const base64Image = readString(body.base64Image) ?? readString(body.image)
  const box = readSelectBox(body.box)
  const mosaicWidth = readNumber(body.mosaicWidth)
  const mosaicHeight = readNumber(body.mosaicHeight)
  const prompt = resolveSamPrompt(readString(body.prompt) ?? readString(body.textPrompt))

  if (!projectId || !base64Image || !box || mosaicWidth === undefined || mosaicHeight === undefined) {
    return NextResponse.json({ error: API_ERROR.MISSING_SEGMENT_FIELDS }, { status: 400 })
  }

  const hasAccess = await verifyProjectAccess(projectId, session.user.id)
  if (!hasAccess) {
    return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
  }

  if (!readFalApiKey()) {
    return NextResponse.json({ error: API_ERROR.FAL_KEY_NOT_PROVIDED }, { status: 500 })
  }

  try {
    const handle = await triggerOwnedRun<typeof segmentObjectTask>(
      TRIGGER_TASK_ID.SEGMENT_OBJECT,
      {
        projectId,
        base64Image,
        box,
        prompt,
        mosaicWidth,
        mosaicHeight,
      },
      { ttl: TRIGGER_TASK_TTL.SEGMENT },
    )

    return NextResponse.json({
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.SEGMENT_TRIGGER_ERROR, getErrorMessage(error))
    return NextResponse.json(
      { error: getErrorMessage(error) || API_ERROR.SEGMENT_TRIGGER_FAILED },
      { status: 502 },
    )
  }
}
