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
import { RunMetadataKey } from '@/shared/jobs/constants/owned-run'

const retrieveOwnedRun = vi.fn()
const completeToken = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/shared/jobs/owned-run', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/jobs/owned-run')>()
  return {
    ...actual,
    retrieveOwnedRun: (...args: unknown[]) => retrieveOwnedRun(...args),
  }
})
vi.mock('@trigger.dev/sdk', () => ({
  wait: { completeToken: (...args: unknown[]) => completeToken(...args) },
}))

import { POST } from '../route'

const TOKEN_ID = 'tok_owner'
const RUN_ID = 'run_owner'

beforeEach(() => {
  resetHarness()
  retrieveOwnedRun.mockReset()
  completeToken.mockReset()
  retrieveOwnedRun.mockResolvedValue({
    metadata: { [RunMetadataKey.WaitTokenId]: TOKEN_ID },
  })
})

describe('POST /api/complete-token', () => {
  it('rejects an anonymous caller', async () => {
    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { tokenId: TOKEN_ID, action: 'accept', variantIndex: 0, runId: RUN_ID },
      })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(completeToken).not.toHaveBeenCalled()
  })

  it('returns 404 when the caller does not own the run', async () => {
    signIn(E2E_HARNESS_USER)
    retrieveOwnedRun.mockRejectedValue(new JobAccessError('not found'))

    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { tokenId: TOKEN_ID, action: 'accept', variantIndex: 0, runId: RUN_ID },
      })
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(completeToken).not.toHaveBeenCalled()
  })

  it('returns 404 when waitTokenId does not match', async () => {
    signIn(E2E_HARNESS_USER)
    retrieveOwnedRun.mockResolvedValue({
      metadata: { [RunMetadataKey.WaitTokenId]: 'tok_other' },
    })

    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { tokenId: TOKEN_ID, action: 'accept', variantIndex: 0, runId: RUN_ID },
      })
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(completeToken).not.toHaveBeenCalled()
  })

  it('completes the token when the owner matches waitTokenId', async () => {
    signIn(OTHER_TENANT_USER)
    const res = await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { tokenId: TOKEN_ID, action: 'accept', variantIndex: 1, runId: RUN_ID },
      })
    )
    expect(res.status).toBe(HttpStatus.OK)
    expect(completeToken).toHaveBeenCalledWith(TOKEN_ID, { action: 'accept', variantIndex: 1 })
  })
})
