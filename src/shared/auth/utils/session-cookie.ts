/**
 * Supabase session cookie detection for the edge proxy.
 *
 * The name is derived from the project ref (`sb-<ref>-auth-token`) and a large
 * session is split into `.0`, `.1` chunks, so it is matched by shape rather
 * than hardcoded — a hardcoded name silently stops matching when the project
 * ref changes, and a proxy that stops seeing sessions fails open.
 */
export const SUPABASE_COOKIE_PREFIX = 'sb-'
export const SUPABASE_AUTH_COOKIE_SUFFIX = '-auth-token'

export function isSupabaseAuthCookieName(name: string): boolean {
  if (!name.startsWith(SUPABASE_COOKIE_PREFIX)) return false
  const withoutChunkSuffix = name.replace(/\.\d+$/, '')
  return withoutChunkSuffix.endsWith(SUPABASE_AUTH_COOKIE_SUFFIX)
}

/** Deny mode: report logs and lets the request through; enforce returns 401. */
export enum ApiDenyMode {
  Report = 'report',
  Enforce = 'enforce',
}

export const API_DENY_MODE_ENV = 'MIDDLEWARE_DENY_MODE'
export const API_PATH_PREFIX = '/api/'
export const PROXY_DENY_LOG = '[proxy] unauthenticated API request'
