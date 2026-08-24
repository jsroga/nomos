/**
 * Default-deny for `/api/**` at the edge.
 *
 * Not the authorization decision — it cannot do a database lookup, so it only
 * answers "is there plausibly a session at all". Route handlers still verify who
 * the caller is, and ownership checks still decide what they may touch. What
 * this removes is the class where a route forgot to ask entirely: a new route
 * is protected before anyone writes a line in it.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isPublicApiPath } from '@/shared/auth/constants/public-api-paths'
import {
  API_DENY_MODE_ENV,
  API_PATH_PREFIX,
  ApiDenyMode,
  PROXY_DENY_LOG,
  isSupabaseAuthCookieName,
} from '@/shared/auth/constants/session-cookie'
import {
  ApiErrorMessage,
  EnvVarName,
  HttpHeader,
  HttpStatus,
  NodeEnv,
} from '@/shared/data/constants/protocol'

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(cookie => isSupabaseAuthCookieName(cookie.name))
}

/** Mirrors the dev/test bypass in `getUserSession` exactly — same header, same env gate. */
function isE2eBypass(request: NextRequest): boolean {
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv !== NodeEnv.Development && nodeEnv !== NodeEnv.Test) return false

  const secret = process.env[EnvVarName.E2eBypassAuthSecret]
  if (!secret) return false

  return request.headers.get(HttpHeader.BYPASS_AUTH) === secret
}

/** 401 for an anonymous API request, or null to let the request continue. */
export function denyAnonymousApiRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith(API_PATH_PREFIX)) return null
  if (isPublicApiPath(pathname)) return null
  if (isE2eBypass(request)) return null
  if (hasSessionCookie(request)) return null

  // Report mode exists so this can be switched on and observed before it bites:
  // anything that shows up here is either a missing allowlist entry or a real
  // vulnerability, and both are worth seeing before returning 401 to users.
  if (process.env[API_DENY_MODE_ENV] !== ApiDenyMode.Enforce) {
    console.warn(`${PROXY_DENY_LOG} (report mode): ${pathname}`)
    return null
  }

  return NextResponse.json(
    { error: ApiErrorMessage.UNAUTHORIZED },
    { status: HttpStatus.UNAUTHORIZED }
  )
}
