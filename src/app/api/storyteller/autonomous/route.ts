// Flagged autonomous drafting route (FF_STORYTELLER_AUTONOMOUS=true). Starts the
// durable goals loop and streams its progress as the frozen SSE frames. Server
// submodule imports only (the `@/domains/storyteller` barrel pulls client UI).
import {
  jsonError,
  recordStreamRouteError,
  STREAM_ROUTE_TEXT,
} from '../chat/stream/stream-route-handler'
import { streamAutonomousDraftResponse } from './autonomous-stream-wire'
import { isStorytellerAutonomousEnabled } from '@/domains/storyteller/ai/agents/AutonomousAuthor/autonomous-author-agent'
import { readString, recordFromJson } from '@/shared/data/json-guards'

const AUTONOMOUS_DISABLED_MESSAGE = 'Autonomous drafting is disabled'
const AUTONOMOUS_MISSING_FIELDS = 'objective and prompt are required'
const AUTONOMOUS_THREAD_FALLBACK = 'storyteller-autonomous'

export async function POST(req: Request) {
  try {
    if (!isStorytellerAutonomousEnabled()) {
      return jsonError(AUTONOMOUS_DISABLED_MESSAGE, 404)
    }

    const { requireAuth } = await import('@/shared/auth/auth')
    const { session } = await requireAuth()
    if (!session) {
      return jsonError(STREAM_ROUTE_TEXT.errUnauthorized, 401)
    }

    const body = recordFromJson(await req.json())
    const objective = readString(body.objective)
    const prompt = readString(body.prompt)
    if (!objective || !prompt) {
      return jsonError(AUTONOMOUS_MISSING_FIELDS, 400)
    }

    const episodeId = readString(body.episodeId)
    return streamAutonomousDraftResponse({
      threadId: episodeId ?? AUTONOMOUS_THREAD_FALLBACK,
      resourceId: session.user.id,
      objective,
      prompt,
      traceId: `autonomous-${Date.now()}`,
    })
  } catch (error) {
    console.error(STREAM_ROUTE_TEXT.logStreamingError, error)
    recordStreamRouteError(error)
    return jsonError(STREAM_ROUTE_TEXT.errStreamingFailed, 500)
  }
}
