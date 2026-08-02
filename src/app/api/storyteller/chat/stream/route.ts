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

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'
export const maxDuration = 300

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
