import { normalizeMastraTraceId } from '@/domains/storyteller/ai/tracing'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { recordStreamRouteError, jsonError, runStorytellerStream } from './stream-post-handler'
import { STREAM_ROUTE_TEXT } from './stream-route-wire'

interface ParsedStreamBody {
  message?: string
  projectId?: string
  episodeId?: string
  traceId?: string
  agenticMode?: boolean
  currentPhase?: string
  modelName?: string
}

export async function handleStorytellerStreamPost(
  req: Request,
  sessionUserId: string
): Promise<Response> {
  const body: ParsedStreamBody = await req.json()
  const { message, projectId, episodeId, traceId: bodyTraceId, agenticMode, currentPhase, modelName } =
    body

  if (!message || typeof message !== 'string') {
    return jsonError(STREAM_ROUTE_TEXT.errInvalidMessage, 400)
  }

  if (message.length > 10000) {
    return jsonError(STREAM_ROUTE_TEXT.errMessageTooLong, 400)
  }

  const { verifyEpisodeAccess } = await import(
    '@/domains/storyteller/services/access-verification-service'
  )

  // The scope both proves access and is what downstream services require.
  let scope: ProjectScope | undefined
  if (projectId) {
    try {
      scope = await projectScope(projectId, sessionUserId)
    } catch (error) {
      if (error instanceof ProjectForbidden) {
        return jsonError(STREAM_ROUTE_TEXT.errProjectAccess, 403)
      }
      throw error
    }
  }

  if (episodeId && !(await verifyEpisodeAccess(episodeId, sessionUserId))) {
    return jsonError(STREAM_ROUTE_TEXT.errEpisodeAccess, 403)
  }

  const traceId = normalizeMastraTraceId(
    req.headers.get(STREAM_ROUTE_TEXT.traceIdHeader) || bodyTraceId
  )

  return runStorytellerStream({
    message,
    scope,
    episodeId,
    traceId,
    agenticMode,
    currentPhase,
    modelName,
    userId: sessionUserId,
  })
}

export { recordStreamRouteError, jsonError, STREAM_ROUTE_TEXT }
