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

const CHARACTER_ID = '77777777-7777-4777-8777-777777777777'
const OTHER_PROJECT = '88888888-8888-4888-8888-888888888888'

const verifyCharacterAccess = vi.fn()
const updateSet = vi.fn()

vi.mock('@/shared/auth/auth', async () => authModuleStub())
vi.mock('@/domains/storyteller/server', () => ({
  verifyCharacterAccess: (...args: unknown[]) => verifyCharacterAccess(...args),
}))
vi.mock('@/db/client', () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        updateSet(values)
        return { where: () => ({ returning: async () => [{ id: CHARACTER_ID }] }) }
      },
    }),
  },
}))

import { PATCH } from '../route'

beforeEach(() => {
  resetHarness()
  verifyCharacterAccess.mockReset()
  updateSet.mockReset()
  verifyCharacterAccess.mockResolvedValue({ hasAccess: true, projectId: 'p1' })
})

describe('PATCH /api/storyteller/characters/[characterId]', () => {
  it('rejects an anonymous caller', async () => {
    const res = await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { name: 'x' } }),
      routeParams({ characterId: CHARACTER_ID })
    )
    expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('returns 404 for a character in another tenant', async () => {
    signIn(E2E_HARNESS_USER)
    verifyCharacterAccess.mockResolvedValue({ hasAccess: false })
    const res = await PATCH(
      routeRequest({ method: HttpMethod.Patch, body: { name: 'x' } }),
      routeParams({ characterId: CHARACTER_ID })
    )
    expect(res.status).toBe(HttpStatus.NOT_FOUND)
    expect(updateSet).not.toHaveBeenCalled()
  })

  it('never writes projectId or id even for the owner', async () => {
    signIn(E2E_HARNESS_USER)
    await PATCH(
      routeRequest({
        method: HttpMethod.Patch,
        body: { name: 'ok', projectId: OTHER_PROJECT, id: 'forged' },
      }),
      routeParams({ characterId: CHARACTER_ID })
    )
    expect(updateSet).toHaveBeenCalledWith({ name: 'ok' })
  })
})
