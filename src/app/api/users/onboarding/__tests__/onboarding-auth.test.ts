import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  OTHER_TENANT_USER,
  authModuleStub,
  harnessAuth,
  resetHarness,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'

const adminGetUserById = vi.fn()
const adminUpdateUserById = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/shared/auth/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => adminGetUserById(...args),
        updateUserById: (...args: unknown[]) => adminUpdateUserById(...args),
      },
    },
  },
}))

import { GET, POST } from '../route'

beforeEach(() => {
  resetHarness()
  adminGetUserById.mockReset()
  adminUpdateUserById.mockReset()
  adminGetUserById.mockResolvedValue({ data: { user: { id: E2E_HARNESS_USER, user_metadata: {} } }, error: null })
  adminUpdateUserById.mockResolvedValue({ error: null })
})

describe('POST /api/users/onboarding', () => {
  it('rejects an anonymous caller', async () => {
    const response = await POST(
      routeRequest({ method: HttpMethod.Post, body: { action: 'complete', userId: OTHER_TENANT_USER } })
    )
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(adminUpdateUserById).not.toHaveBeenCalled()
  })

  it('never writes to a user id supplied in the body', async () => {
    signIn(E2E_HARNESS_USER)

    await POST(
      routeRequest({
        method: HttpMethod.Post,
        body: { action: 'skipAll', userId: OTHER_TENANT_USER },
      })
    )

    // Whatever the outcome, the admin write must target the session's user.
    for (const call of adminUpdateUserById.mock.calls) {
      expect(call[0]).not.toBe(OTHER_TENANT_USER)
    }
    for (const call of adminGetUserById.mock.calls) {
      expect(call[0]).not.toBe(OTHER_TENANT_USER)
    }
  })
})

describe('GET /api/users/onboarding', () => {
  it('rejects an anonymous caller', async () => {
    const response = await GET(routeRequest({ query: { userId: OTHER_TENANT_USER } }))
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('never reads a user id supplied in the query', async () => {
    signIn(E2E_HARNESS_USER)
    await GET(routeRequest({ query: { userId: OTHER_TENANT_USER } }))

    for (const call of adminGetUserById.mock.calls) {
      expect(call[0]).not.toBe(OTHER_TENANT_USER)
    }
    expect(harnessAuth.session?.user.id).toBe(E2E_HARNESS_USER)
  })
})
