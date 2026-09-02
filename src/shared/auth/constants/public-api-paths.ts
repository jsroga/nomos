/**
 * The only routes under /api that may serve an anonymous caller.
 *
 * This is the single exemption list permitted anywhere in the gate system,
 * because it *is* the security decision rather than a way to avoid one. Every
 * entry states why it is public. Adding one is a security review, not a lint fix.
 *
 * Consumed by `src/middleware.ts` (default-deny) and by the route-conformance
 * test, so the two cannot drift apart.
 */
export const PUBLIC_API_PATHS = [
  '/api/auth/signin', // establishes the session
  '/api/auth/signup', // establishes the session
  '/api/auth/forgot-password', // pre-session recovery
  '/api/waitlist', // marketing capture, no tenant data
  '/api/mcp', // authenticates with its own hashed API key, not a cookie
] as const

export type PublicApiPath = (typeof PUBLIC_API_PATHS)[number]

/** Exact match, or a `/`-terminated prefix. Never a bare `startsWith`. */
export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    publicPath => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  )
}
