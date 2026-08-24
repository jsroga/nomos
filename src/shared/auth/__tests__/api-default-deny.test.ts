import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { denyAnonymousApiRequest } from '@/shared/auth/api-default-deny'
import { isPublicApiPath } from '@/shared/auth/constants/public-api-paths'
import { ApiDenyMode, isSupabaseAuthCookieName } from '@/shared/auth/constants/session-cookie'
import { HttpHeader, HttpStatus } from '@/shared/data/constants/protocol'

const BYPASS_SECRET = 'harness-bypass-secret'

function request(pathname: string, init: { cookie?: string; bypass?: string } = {}) {
  const headers = new Headers()
  if (init.cookie) headers.set('cookie', init.cookie)
  if (init.bypass) headers.set(HttpHeader.BYPASS_AUTH, init.bypass)
  return new NextRequest(`https://harness.test${pathname}`, { headers })
}

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.MIDDLEWARE_DENY_MODE = ApiDenyMode.Enforce
  process.env.E2E_BYPASS_AUTH_SECRET = BYPASS_SECRET
})

afterEach(() => {
  vi.unstubAllEnvs()
  process.env = { ...originalEnv }
})

describe('denyAnonymousApiRequest', () => {
  it('denies an anonymous API request', () => {
    const result = denyAnonymousApiRequest(request('/api/storyteller/plan'))
    expect(result?.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('allows a request carrying a supabase session cookie', () => {
    const result = denyAnonymousApiRequest(
      request('/api/storyteller/plan', { cookie: 'sb-abcdefgh-auth-token=xyz' })
    )
    expect(result).toBeNull()
  })

  it('allows a chunked session cookie', () => {
    const result = denyAnonymousApiRequest(
      request('/api/storyteller/plan', { cookie: 'sb-abcdefgh-auth-token.0=part' })
    )
    expect(result).toBeNull()
  })

  it('allows every declared public path', () => {
    for (const path of ['/api/auth/signin', '/api/waitlist', '/api/complete-token', '/api/mcp']) {
      expect(denyAnonymousApiRequest(request(path)), path).toBeNull()
    }
  })

  it('does not treat /api/authorise as public — prefix matching is not naive', () => {
    expect(isPublicApiPath('/api/authorise')).toBe(false)
    const result = denyAnonymousApiRequest(request('/api/authorise'))
    expect(result?.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('ignores non-API paths', () => {
    expect(denyAnonymousApiRequest(request('/projects'))).toBeNull()
  })

  it('honours the E2E bypass in test env', () => {
    const result = denyAnonymousApiRequest(
      request('/api/storyteller/plan', { bypass: BYPASS_SECRET })
    )
    expect(result).toBeNull()
  })

  it('ignores the E2E bypass with the wrong secret', () => {
    const result = denyAnonymousApiRequest(request('/api/storyteller/plan', { bypass: 'wrong' }))
    expect(result?.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('ignores the E2E bypass entirely in production', () => {
    // NODE_ENV is readonly on the typed env; vi.stubEnv is the supported route.
    vi.stubEnv('NODE_ENV', 'production')
    const result = denyAnonymousApiRequest(
      request('/api/storyteller/plan', { bypass: BYPASS_SECRET })
    )
    expect(result?.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('lets requests through in report mode but still logs them', () => {
    process.env.MIDDLEWARE_DENY_MODE = ApiDenyMode.Report
    expect(denyAnonymousApiRequest(request('/api/storyteller/plan'))).toBeNull()
  })
})

describe('isSupabaseAuthCookieName', () => {
  it.each([
    ['sb-abc-auth-token', true],
    ['sb-abc-auth-token.0', true],
    ['sb-abc-auth-token.11', true],
    ['sb-abc-provider-token', false],
    ['session', false],
    ['auth-token', false],
  ])('%s → %s', (name, expected) => {
    expect(isSupabaseAuthCookieName(name)).toBe(expected)
  })
})
