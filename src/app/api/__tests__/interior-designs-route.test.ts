import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const testState = vi.hoisted(() => {
  const state = {
    accessRows: [] as Array<{ designId: string; projectId: string; projectUserId: string }>,
    updatedRows: [] as Array<Record<string, unknown>>,
    lastUpdatePayload: undefined as Record<string, unknown> | undefined,
  }

  const requireAuth = vi.fn()
  const checkRateLimit = vi.fn()
  const verifyProjectAccess = vi.fn()

  const selectLimit = vi.fn(async () => state.accessRows)
  const selectWhere = vi.fn(() => ({ limit: selectLimit }))
  const selectInnerJoin = vi.fn(() => ({ where: selectWhere }))
  const selectFrom = vi.fn(() => ({ innerJoin: selectInnerJoin }))
  const select = vi.fn(() => ({ from: selectFrom }))

  const updateReturning = vi.fn(async () => state.updatedRows)
  const updateWhere = vi.fn(() => ({ returning: updateReturning }))
  const updateSet = vi.fn((payload: Record<string, unknown>) => {
    state.lastUpdatePayload = payload
    return { where: updateWhere }
  })
  const update = vi.fn(() => ({ set: updateSet }))

  return {
    state,
    requireAuth,
    checkRateLimit,
    verifyProjectAccess,
    select,
    update,
  }
})

vi.mock('@/lib/db', () => ({
  db: {
    select: testState.select,
    update: testState.update,
  },
}))

vi.mock('@/db/schema', () => ({
  interiorDesigns: { id: 'interior_designs.id', projectId: 'interior_designs.projectId' },
  projects: { id: 'projects.id', userId: 'projects.userId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  desc: vi.fn((value: unknown) => value),
}))

vi.mock('@/lib/api-utils', () => ({
  requireAuth: testState.requireAuth,
  checkRateLimit: testState.checkRateLimit,
}))

vi.mock('@/domains/storyteller', () => ({
  verifyProjectAccess: testState.verifyProjectAccess,
}))

import { PATCH } from '../interior-designer/designs/route'

const jsonRequest = (body: Record<string, unknown>) =>
  new NextRequest('http://localhost/api/interior-designer/designs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('PATCH /api/interior-designer/designs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    testState.requireAuth.mockResolvedValue({
      session: { user: { id: 'user-1' } },
    })

    testState.state.accessRows = [
      {
        designId: 'design-1',
        projectId: 'project-1',
        projectUserId: 'user-1',
      },
    ]

    testState.state.updatedRows = [
      {
        id: 'design-1',
        name: 'Renamed Scene',
      },
    ]

    testState.state.lastUpdatePayload = undefined
  })

  it('returns 400 when the design id is missing', async () => {
    const response = await PATCH(jsonRequest({ name: 'No Id' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Design ID is required',
    })
  })

  it('returns 401 when the user is not authenticated', async () => {
    testState.requireAuth.mockResolvedValue({ session: null })

    const response = await PATCH(
      jsonRequest({
        id: 'design-1',
        name: 'Blocked Rename',
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized',
    })
  })

  it('returns 403 when the user does not own the design', async () => {
    testState.state.accessRows = [
      {
        designId: 'design-1',
        projectId: 'project-1',
        projectUserId: 'other-user',
      },
    ]

    const response = await PATCH(
      jsonRequest({
        id: 'design-1',
        name: 'Blocked Rename',
      })
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized',
    })
    expect(testState.update).not.toHaveBeenCalled()
  })

  it('persists a name-only rename and refreshes updatedAt', async () => {
    const response = await PATCH(
      jsonRequest({
        id: 'design-1',
        name: 'Renamed Scene',
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 'design-1',
      name: 'Renamed Scene',
    })

    expect(testState.update).toHaveBeenCalledTimes(1)
    expect(testState.state.lastUpdatePayload).toEqual({
      name: 'Renamed Scene',
      updatedAt: expect.any(Date),
    })
  })
})
