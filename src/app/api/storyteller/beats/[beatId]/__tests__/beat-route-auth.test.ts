import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  authModuleStub,
  resetHarness,
  routeParams,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod, HttpStatus } from '@/shared/data/constants/protocol'

const BEAT_ID = '55555555-5555-4555-8555-555555555555'
const OTHER_EPISODE = '66666666-6666-4666-8666-666666666666'

const verifyBeatAccess = vi.fn()
const updateSet = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/domains/storyteller/server', () => ({
  verifyBeatAccess: (...args: unknown[]) => verifyBeatAccess(...args),
}))
vi.mock('@/db/client', () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        updateSet(values)
        return { where: () => ({ returning: async () => [{ id: BEAT_ID }] }) }
      },
    }),
    delete: () => ({ where: async () => undefined }),
  },
}))

import { PATCH } from '../route'

beforeEach(() => {
  resetHarness()
  verifyBeatAccess.mockReset()
  updateSet.mockReset()
  verifyBeatAccess.mockResolvedValue({ hasAccess: true, projectId: 'p1', episodeId: 'e1' })
})

describe('PATCH /api/storyteller/beats/[beatId]', () => {
  it('rejects an anonymous caller', async () => {
    const res = await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { logline: 'x' } }),
      routeParams({ beatId: BEAT_ID })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('returns 404 for a beat in another tenant', async () => {
    signIn(E2E_HARNESS_USER)
    verifyBeatAccess.mockResolvedValue({ hasAccess: false })
    const res = await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { logline: 'x' } }),
      routeParams({ beatId: BEAT_ID })
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('never writes episodeId, projectId or id even for the owner', async () => {
    signIn(E2E_HARNESS_USER)
    await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { logline: 'ok', episodeId: OTHER_EPISODE, projectId: 'p-other', id: 'forged' },
      }),
      routeParams({ beatId: BEAT_ID })
    )
    expect(updateSet).toHaveBeenCalledWith({ logline: 'ok' })
  })
})
