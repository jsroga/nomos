import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  OTHER_TENANT_USER,
  authModuleStub,
  resetHarness,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'
import { JobAccessError } from '@/shared/jobs/owned-run'

const retrieveOwnedRun = vi.fn()
const createPublicToken = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/shared/jobs/owned-run', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/jobs/owned-run')>()
  return {
    ...actual,
    retrieveOwnedRun: (...args: unknown[]) => retrieveOwnedRun(...args),
  }
})
vi.mock('@trigger.dev/sdk', () => ({
  auth: { createPublicToken: (...args: unknown[]) => createPublicToken(...args) },
}))

import { POST } from '../route'

const OWNED = 'run_owned'
const FOREIGN = 'run_foreign'

beforeEach(() => {
  resetHarness()
  retrieveOwnedRun.mockReset()
  createPublicToken.mockReset()
  createPublicToken.mockResolvedValue('public-token')
  retrieveOwnedRun.mockResolvedValue({ id: OWNED })
})

describe('POST /api/trigger/token', () => {
  it('rejects an anonymous caller', async () => {
    const res = await POST(
      routeRequest({ method: HttpMethod.Post, body: { runIds: [OWNED] } }),
      { params: Promise.resolve({}) }
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(createPublicToken).not.toHaveBeenCalled()
  })

  it('refuses the whole request if any run is not owned', async () => {
    signIn(E2E_HARNESS_USER)
    retrieveOwnedRun.mockImplementation(async (runId: string) => {
      if (runId === FOREIGN) throw new JobAccessError('not found')
      return { id: runId }
    })

    const res = await POST(
      routeRequest({ method: HttpMethod.Post, body: { runIds: [OWNED, FOREIGN] } }),
      { params: Promise.resolve({}) }
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(createPublicToken).not.toHaveBeenCalled()
  })

  it('mints a token when every run is owned', async () => {
    signIn(OTHER_TENANT_USER)
    const res = await POST(
      routeRequest({ method: HttpMethod.Post, body: { runIds: [OWNED] } }),
      { params: Promise.resolve({}) }
    )
    expect(res.status).toBe(HttpStatus.OK)
    expect(createPublicToken).toHaveBeenCalled()
  })
})
