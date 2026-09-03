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

const EPISODE_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_PROJECT = '44444444-4444-4444-8444-444444444444'

const verifyEpisodeAccess = vi.fn()
const updateSet = vi.fn()
const deleteWhere = vi.fn()
const findFirst = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/domains/storyteller/server', async importOriginal => {
  function isModuleNamespace(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
  const actual = await importOriginal()
  const extras = {
    verifyEpisodeAccess: (...args: unknown[]) => verifyEpisodeAccess(...args),
  }
  if (isModuleNamespace(actual)) return { ...actual, ...extras }
  return extras
})
vi.mock('@/db/client', () => ({
  db: {
    query: { episodes: { findFirst: (...args: unknown[]) => findFirst(...args) } },
    update: () => ({
      set: (values: unknown) => {
        updateSet(values)
        return { where: () => ({ returning: async () => [{ id: EPISODE_ID }] }) }
      },
    }),
    delete: () => ({ where: (...args: unknown[]) => deleteWhere(...args) }),
  },
}))

import { DELETE, GET, PATCH } from '../route'

beforeEach(() => {
  resetHarness()
  verifyEpisodeAccess.mockReset()
  updateSet.mockReset()
  deleteWhere.mockReset()
  findFirst.mockReset()
  verifyEpisodeAccess.mockResolvedValue({ hasAccess: true, projectId: 'p1' })
  findFirst.mockResolvedValue({ id: EPISODE_ID, storyPlan: {} })
})

describe('GET', () => {
  it('rejects an anonymous caller', async () => {
    const res = await GET(routeRequest(), routeParams({ episodeId: EPISODE_ID }))
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
  })

  it('returns 404 for an episode in another tenant', async () => {
    signIn(E2E_HARNESS_USER)
    verifyEpisodeAccess.mockResolvedValue({ hasAccess: false })
    const res = await GET(routeRequest(), routeParams({ episodeId: EPISODE_ID }))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
  })
})

describe('PATCH', () => {
  it('rejects an anonymous caller', async () => {
    const res = await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { title: 'x' } }),
      routeParams({ episodeId: EPISODE_ID })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('rejects unknown keys such as projectId instead of writing them', async () => {
    signIn(E2E_HARNESS_USER)
    const res = await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { title: 'ok', projectId: OTHER_PROJECT, id: 'forged', createdAt: '2020-01-01' },
      }),
      routeParams({ episodeId: EPISODE_ID })
    )

    expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('still writes the fields a caller is allowed to set', async () => {
    signIn(E2E_HARNESS_USER)
    await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { title: 'new title' } }),
      routeParams({ episodeId: EPISODE_ID })
    )
    expect(updateSet.mock.calls[0][0]).toMatchObject({ title: 'new title' })
  })
})

describe('DELETE', () => {
  it('rejects an anonymous caller', async () => {
    const res = await DELETE(routeRequest({ method: HttpMethod.Delete }), routeParams({ episodeId: EPISODE_ID }))
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(deleteWhere).not.toHaveBeenCalled()
  })

  it('refuses to delete an episode in another tenant', async () => {
    signIn(E2E_HARNESS_USER)
    verifyEpisodeAccess.mockResolvedValue({ hasAccess: false })
    const res = await DELETE(routeRequest({ method: HttpMethod.Delete }), routeParams({ episodeId: EPISODE_ID }))
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(deleteWhere).not.toHaveBeenCalled()
  })
})
