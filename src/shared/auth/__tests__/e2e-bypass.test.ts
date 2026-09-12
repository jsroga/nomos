import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AuthBypassFlag,
  EnvVarName,
  HttpHeader,
  NodeEnv,
} from '@/shared/data/constants/protocol'
import { isE2eBypassRequest, isE2eBypassRuntime } from '../utils/e2e-bypass'

const SECRET = 'harness-bypass-secret'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isE2eBypassRuntime', () => {
  it('is on in test without a prod flag', () => {
    expect(isE2eBypassRuntime()).toBe(true)
  })

  it('is off in production without the prod flag', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    expect(isE2eBypassRuntime()).toBe(false)
  })

  it('is on in production when the prod flag is set', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    vi.stubEnv(EnvVarName.E2eAllowProdBypass, AuthBypassFlag.True)
    expect(isE2eBypassRuntime()).toBe(true)
  })
})

describe('isE2eBypassRequest', () => {
  it('accepts the matching header in test', () => {
    vi.stubEnv(EnvVarName.E2eBypassAuthSecret, SECRET)
    const request = {
      headers: { get: (name: string) => (name === HttpHeader.BYPASS_AUTH ? SECRET : null) },
    }
    expect(isE2eBypassRequest(request)).toBe(true)
  })

  it('rejects the matching header in production without the prod flag', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    vi.stubEnv(EnvVarName.E2eBypassAuthSecret, SECRET)
    const request = {
      headers: { get: (name: string) => (name === HttpHeader.BYPASS_AUTH ? SECRET : null) },
    }
    expect(isE2eBypassRequest(request)).toBe(false)
  })

  it('accepts the matching header in production when the prod flag is set', () => {
    vi.stubEnv('NODE_ENV', NodeEnv.Production)
    vi.stubEnv(EnvVarName.E2eAllowProdBypass, AuthBypassFlag.True)
    vi.stubEnv(EnvVarName.E2eBypassAuthSecret, SECRET)
    const request = {
      headers: { get: (name: string) => (name === HttpHeader.BYPASS_AUTH ? SECRET : null) },
    }
    expect(isE2eBypassRequest(request)).toBe(true)
  })
})
