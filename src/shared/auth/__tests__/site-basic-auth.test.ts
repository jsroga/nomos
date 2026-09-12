import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { enforceSiteBasicAuth } from '@/shared/auth/site-basic-auth'
import {
  AuthBypassFlag,
  EnvVarName,
  HttpHeader,
  HttpStatus,
  NodeEnv,
} from '@/shared/data/constants/protocol'

const BYPASS_SECRET = 'harness-bypass-secret'
const PREVIEW_PASSWORD = 'preview-lock'

function request(init: { bypass?: string } = {}) {
  const headers = new Headers()
  if (init.bypass) headers.set(HttpHeader.BYPASS_AUTH, init.bypass)
  return new NextRequest('https://harness.test/api/storyteller/plan', { headers })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('enforceSiteBasicAuth', () => {
  beforeEach(() => {
    vi.stubEnv(EnvVarName.BasicAuthPassword, PREVIEW_PASSWORD)
    vi.stubEnv(EnvVarName.E2eBypassAuthSecret, BYPASS_SECRET)
  })

  it('blocks anonymous production traffic when the preview lock is on', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    const result = enforceSiteBasicAuth(request({ bypass: BYPASS_SECRET }))
    expect(result?.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('lets the E2E header through production when the prod flag is on', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    vi.stubEnv(EnvVarName.E2eAllowProdBypass, AuthBypassFlag.True)
    expect(enforceSiteBasicAuth(request({ bypass: BYPASS_SECRET }))).toBeNull()
  })
})
