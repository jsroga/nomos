import { describe, expect, it } from 'vitest'
import {
  AUTH_FLOW_TYPE,
  AUTH_ROUTE,
  AuthEmailOtpType,
} from '@/shared/auth/constants/auth-messages'
import {
  resolveAuthCallbackRedirect,
  resolveAuthEmailOtpType,
  sanitizeAuthCallbackNext,
} from '@/shared/auth/utils/auth-callback-next'

const PROJECT_STORYTELLER = '/11111111-1111-4111-8111-111111111111/storyteller'

describe('sanitizeAuthCallbackNext', () => {
  it('falls back when next is missing', () => {
    expect(sanitizeAuthCallbackNext(null)).toBe(AUTH_ROUTE.PROJECTS)
    expect(sanitizeAuthCallbackNext('')).toBe(AUTH_ROUTE.PROJECTS)
  })

  it('keeps a same-origin project path', () => {
    expect(sanitizeAuthCallbackNext(PROJECT_STORYTELLER)).toBe(PROJECT_STORYTELLER)
  })

  it('keeps a query string on a same-origin path', () => {
    expect(sanitizeAuthCallbackNext('/projects?tab=hub')).toBe('/projects?tab=hub')
  })

  it('rejects protocol-relative, absolute, and embedded-protocol paths', () => {
    expect(sanitizeAuthCallbackNext('//evil.example/phish')).toBe(AUTH_ROUTE.PROJECTS)
    expect(sanitizeAuthCallbackNext('https://evil.example/phish')).toBe(AUTH_ROUTE.PROJECTS)
    expect(sanitizeAuthCallbackNext('/https://evil.example/phish')).toBe(AUTH_ROUTE.PROJECTS)
  })

  it('rejects backslashes and embedded credentials', () => {
    expect(sanitizeAuthCallbackNext('/\\evil.example')).toBe(AUTH_ROUTE.PROJECTS)
    expect(sanitizeAuthCallbackNext('//user:pass@evil.example')).toBe(AUTH_ROUTE.PROJECTS)
  })

  it('normalizes parent-segment traversal on the same origin', () => {
    expect(sanitizeAuthCallbackNext('/projects/../../storyteller')).toBe('/storyteller')
  })
})

describe('resolveAuthCallbackRedirect', () => {
  it('sends recovery to the reset page', () => {
    expect(
      resolveAuthCallbackRedirect({
        type: AUTH_FLOW_TYPE.RECOVERY,
        next: PROJECT_STORYTELLER,
        sessionAttempted: true,
      }),
    ).toBe(AUTH_ROUTE.RESET_PASSWORD)
  })

  it('ignores next when no session was attempted', () => {
    expect(
      resolveAuthCallbackRedirect({
        type: AUTH_FLOW_TYPE.MAGICLINK,
        next: PROJECT_STORYTELLER,
        sessionAttempted: false,
      }),
    ).toBe(AUTH_ROUTE.PROJECTS)
  })

  it('uses sanitized next after a session attempt', () => {
    expect(
      resolveAuthCallbackRedirect({
        type: AUTH_FLOW_TYPE.MAGICLINK,
        next: PROJECT_STORYTELLER,
        sessionAttempted: true,
      }),
    ).toBe(PROJECT_STORYTELLER)
  })
})

describe('resolveAuthEmailOtpType', () => {
  it('defaults to magiclink', () => {
    expect(resolveAuthEmailOtpType(null)).toBe(AuthEmailOtpType.Magiclink)
    expect(resolveAuthEmailOtpType(AUTH_FLOW_TYPE.MAGICLINK)).toBe(AuthEmailOtpType.Magiclink)
  })

  it('maps recovery', () => {
    expect(resolveAuthEmailOtpType(AUTH_FLOW_TYPE.RECOVERY)).toBe(AuthEmailOtpType.Recovery)
  })
})
