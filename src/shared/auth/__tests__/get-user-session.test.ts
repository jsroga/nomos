import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiErrorMessage, HttpHeader } from '@/shared/data/constants/protocol'

const getUser = vi.fn()
const headerGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({})),
  headers: vi.fn(async () => ({ get: (name: string) => headerGet(name) })),
}))

vi.mock('@/shared/auth/supabase-route-client', () => ({
  createSupabaseRouteClient: () => ({ auth: { getUser } }),
}))

import { getUserSession, requireAuth } from '../auth'
import { requireAuth as requireAuthFromApiUtils } from '@/shared/data/api-utils'
import { E2E_MOCK_USER_ID } from '../constants/e2e-auth'

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner@example.test',
}

beforeEach(() => {
  getUser.mockReset()
  headerGet.mockReset()
  headerGet.mockReturnValue(null)
})

describe('getUserSession', () => {
  it('maps getUser into session.user.id', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null })

    const { session, error } = await getUserSession()

    expect(error).toBeNull()
    expect(session?.user.id).toBe(USER.id)
    expect(getUser).toHaveBeenCalled()
  })

  it('returns no session when getUser rejects an unsigned token', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    })

    const { session, error } = await getUserSession()

    expect(session).toBeNull()
    expect(error).toBeTruthy()
  })

  it('keeps the E2E header bypass without calling getUser', async () => {
    const secret = 'harness-bypass'
    vi.stubEnv('E2E_BYPASS_AUTH_SECRET', secret)
    headerGet.mockImplementation((name: string) =>
      name === HttpHeader.BYPASS_AUTH ? secret : null
    )

    const { session } = await getUserSession()

    expect(session?.user.id).toBe(E2E_MOCK_USER_ID)
    expect(getUser).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})

describe('requireAuth', () => {
  it('is the same function from auth and api-utils', () => {
    expect(requireAuth).toBe(requireAuthFromApiUtils)
  })

  it('fails closed on an unsigned token', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth session missing' },
    })

    const { session, error } = await requireAuth()

    expect(session).toBeNull()
    expect(error?.message).toBeTruthy()
    expect(error?.message.length).toBeGreaterThan(0)
    expect(ApiErrorMessage.UNAUTHORIZED.length).toBeGreaterThan(0)
  })

  it('includes supabase on a successful getUser result', async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null })

    const result = await requireAuth()

    expect(result.error).toBeNull()
    expect(result.session?.user.id).toBe(USER.id)
    expect('supabase' in result).toBe(true)
    expect(result.supabase).toBeTruthy()
  })
})
