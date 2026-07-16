import { NextRequest, NextResponse } from 'next/server'
import { verifyEpisodeAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ApiErrorMessage,
  HttpHeader,
  HttpStatus,
} from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import { recordUserAction, flushObservability } from '@/shared/observability/observability'
import type { ActionHandlerContext } from './_lib/action-handler-context'
import { createContentUpdateHelpers } from './_lib/content-updates'
import { ActionRequestField } from './_lib/constants/action-request-wire'
import { dispatchStorytellerAction, parseStorytellerAction } from './_lib/dispatch-action'
import { readOptionalStringField } from './_lib/read-payload-fields'

function buildHandlerContext(
  projectId: string | undefined,
  episodeId: string | undefined
): ActionHandlerContext {
  const helpers = createContentUpdateHelpers(projectId)
  return {
    projectId,
    episodeId,
    updateSeriesBible: helpers.updateSeriesBible,
    updateStoryPlan: helpers.updateStoryPlan,
  }
}

async function verifyActionAccess(
  projectId: string | undefined,
  episodeId: string | undefined,
  userId: string
): Promise<NextResponse | null> {
  if (projectId && !(await verifyProjectAccess(projectId, userId))) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: 404 })
  }
  if (episodeId && !(await verifyEpisodeAccess(episodeId, userId))) {
    return NextResponse.json({ error: ApiErrorMessage.EPISODE_NOT_FOUND }, { status: 404 })
  }
  return null
}

function recordActionTrace(
  traceId: string,
  action: ReturnType<typeof parseStorytellerAction>,
  body: Record<string, unknown>
) {
  if (!action) return
  try {
    recordUserAction(traceId, {
      type: action.type,
      approved: true,
      payload: action.payload,
      reasoning: readOptionalStringField(body, ActionRequestField.Reasoning),
    })
  } catch {
    /* ignore tracing errors */
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: 401 })
    }

    const body = recordFromJson(await req.json())
    const action = parseStorytellerAction(body)
    if (!action) {
      return NextResponse.json({ error: ApiErrorMessage.INVALID_ACTION }, { status: 400 })
    }

    const projectId = readOptionalStringField(body, ActionRequestField.ProjectId)
    const episodeId = readOptionalStringField(body, ActionRequestField.EpisodeId)

    const accessError = await verifyActionAccess(projectId, episodeId, session.user.id)
    if (accessError) return accessError

    console.log(`📥 Actions API: ${action.type} for project ${projectId}`)

    const traceId =
      req.headers.get(HttpHeader.TRACE_ID) ||
      readOptionalStringField(body, ActionRequestField.TraceId) ||
      `action-${Date.now()}`
    recordActionTrace(traceId, action, body)

    const ctx = buildHandlerContext(projectId, episodeId)
    return await dispatchStorytellerAction(ctx, action)
  } catch (error) {
    console.error(API_LOG_PREFIX.ACTIONS_API_ERROR, error)
    await flushObservability().catch(() => {})
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.ACTION_EXECUTION_FAILED },
      { status: HttpStatus.INTERNAL }
    )
  }
}
