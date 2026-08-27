import { NextRequest, NextResponse } from 'next/server'
import { verifyEpisodeAccess } from '@/domains/storyteller/server'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
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
  scope: ProjectScope | undefined,
  episodeId: string | undefined
): ActionHandlerContext {
  const helpers = createContentUpdateHelpers(scope?.projectId)
  return {
    scope,
    episodeId,
    updateSeriesBible: helpers.updateSeriesBible,
    updateStoryPlan: helpers.updateStoryPlan,
  }
}

/**
 * Establishes access and returns the proof of it, so handlers receive a scope
 * rather than a bare id that a later edit could forget to check.
 */
async function scopeActionAccess(
  projectId: string | undefined,
  episodeId: string | undefined,
  userId: string
): Promise<{ scope: ProjectScope | undefined } | NextResponse> {
  let scope: ProjectScope | undefined
  if (projectId) {
    try {
      scope = await projectScope(projectId, userId)
    } catch (error) {
      if (error instanceof ProjectForbidden) {
        return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: 404 })
      }
      throw error
    }
  }
  if (episodeId && !(await verifyEpisodeAccess(episodeId, userId))) {
    return NextResponse.json({ error: ApiErrorMessage.EPISODE_NOT_FOUND }, { status: 404 })
  }
  return { scope }
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

    const access = await scopeActionAccess(projectId, episodeId, session.user.id)
    if (access instanceof NextResponse) return access

    console.log(`📥 Actions API: ${action.type} for project ${projectId}`)

    const traceId =
      req.headers.get(HttpHeader.TRACE_ID) ||
      readOptionalStringField(body, ActionRequestField.TraceId) ||
      `action-${Date.now()}`
    recordActionTrace(traceId, action, body)

    const ctx = buildHandlerContext(access.scope, episodeId)
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
