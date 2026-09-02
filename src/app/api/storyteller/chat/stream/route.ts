// NOTE: import from specific server-side submodules rather than the
// `@/domains/storyteller` barrel — that barrel also re-exports client UI
// components (e.g. CorkBoard), which pulls client-only hooks into this
// server Route Handler's build graph and breaks compilation.
import {
  handleStorytellerStreamPost,
  recordStreamRouteError,
  jsonError,
  STREAM_ROUTE_TEXT,
} from './stream-route-handler'

// Next.js rejects imported bindings for segment config; keep equal to CHAT_ROUTE_MAX_DURATION_SECONDS.
export const maxDuration = 180

export async function POST(req: Request) {
  try {
    const { requireAuth } = await import('@/shared/auth/auth')
    const { session } = await requireAuth()
    if (!session) {
      return jsonError(STREAM_ROUTE_TEXT.errUnauthorized, 401)
    }

    return handleStorytellerStreamPost(req, session.user.id)
  } catch (error) {
    console.error(STREAM_ROUTE_TEXT.logStreamingError, error)
    recordStreamRouteError(error)
    return jsonError(STREAM_ROUTE_TEXT.errStreamingFailed, 500)
  }
}
