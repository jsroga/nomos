import type { EmailOtpType } from '@supabase/supabase-js'
import {
  AUTH_FLOW_TYPE,
  AUTH_ROUTE,
  AuthEmailOtpType,
} from '@/shared/auth/constants/auth-messages'
import { BlockedHost, UrlProtocolWithColon } from '@/shared/auth/constants/security'

const SANITIZE_ORIGIN = `${UrlProtocolWithColon.Http}//${BlockedHost.Localhost}`

export function resolveAuthEmailOtpType(type: string | null): EmailOtpType {
  if (type === AuthEmailOtpType.Signup) return AuthEmailOtpType.Signup
  if (type === AuthEmailOtpType.Invite) return AuthEmailOtpType.Invite
  if (type === AuthEmailOtpType.Recovery) return AuthEmailOtpType.Recovery
  if (type === AuthEmailOtpType.EmailChange) return AuthEmailOtpType.EmailChange
  if (type === AuthEmailOtpType.Email) return AuthEmailOtpType.Email
  return AuthEmailOtpType.Magiclink
}

export function sanitizeAuthCallbackNext(
  next: string | null | undefined,
  fallback: string = AUTH_ROUTE.PROJECTS,
): string {
  if (typeof next !== 'string' || next.length === 0) return fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  if (next.includes('\\') || next.includes('://')) return fallback

  try {
    const parsed = new URL(next, SANITIZE_ORIGIN)
    if (parsed.origin !== SANITIZE_ORIGIN) return fallback
    if (parsed.username !== '' || parsed.password !== '') return fallback
    const combined = `${parsed.pathname}${parsed.search}`
    if (!combined.startsWith('/') || combined.startsWith('//')) return fallback
    return combined
  } catch {
    return fallback
  }
}

export function resolveAuthCallbackRedirect(params: {
  type: string | null
  next: string | null
  sessionAttempted: boolean
}): string {
  if (params.type === AUTH_FLOW_TYPE.RECOVERY) return AUTH_ROUTE.RESET_PASSWORD
  if (!params.sessionAttempted) return AUTH_ROUTE.PROJECTS
  return sanitizeAuthCallbackNext(params.next)
}
