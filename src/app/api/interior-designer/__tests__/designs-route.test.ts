import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuthMock = vi.fn()
const checkRateLimitMock = vi.fn()
const verifyProjectAccessMock = vi.fn()

let accessQueryResult: Array<{ designId?: string; projectId: string; projectUserId: string }> = []
let updatedDesignResult: Array<Record<string, unknown>> = []
let capturedUpdateValues: Record<string, unknown> | null = null

const selectMock = vi.fn((projection?: unknown) => {
  if (!projection) {
    throw new Error('Unexpected db.select() call in this test')
  }

  return {
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(accessQueryResult),
        })),
      })),
    })),
  }
})

const updateMock = vi.fn(() => ({
  set: vi.fn((updates: Record<string, unknown>) => {
    capturedUpdateValues = updates

    return {
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue(updatedDesignResult),
      })),
    }
  }),
}))

vi.mock('@/lib/api-utils', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}))

vi.mock('@/domains/storyteller', () => ({
  verifyProjectAccess: (...args: unknown[]) => verifyProjectAccessMock(...args),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: (projection?: unknown) => selectMock(projection),
    update: () => updateMock(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('drizzle-orm', async importOriginal => {
  const actual = await importOriginal<typeof import('drizzle-orm')>()

  return {
    ...actual,
    eq: vi.fn((...args: unknown[]) => ({ eq: args })),
    desc: vi.fn((value: unknown) => ({ desc: value })),
  }
})

import { GET, PATCH } from '../designs/route'

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/interior-designer/designs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function responseJson(response: Response) {
  return response.json()
}

describe('interior designer designs route', () => {
  beforeEach(() => {
    requireAuthMock.mockReset()
    checkRateLimitMock.mockReset()
    verifyProjectAccessMock.mockReset()
    selectMock.mockClear()
    updateMock.mockClear()

    accessQueryResult = []
    updatedDesignResult = []
    capturedUpdateValues = null

    requireAuthMock.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
        },
      },
    })
    checkRateLimitMock.mockReturnValue({ allowed: true })
    verifyProjectAccessMock.mockResolvedValue(true)
  })

  it('returns 400 when GET is missing both projectId and designId', async () => {
    const response = await GET(new NextRequest('http://localhost/api/interior-designer/designs'))

    expect(response.status).toBe(400)
    await expect(responseJson(response)).resolves.toMatchObject({
      error: 'Project ID or Design ID is required',
    })
  })

  it('returns 400 when PATCH is missing the design id', async () => {
    const response = await PATCH(jsonRequest({ name: 'Renamed scene' }))

    expect(response.status).toBe(400)
    await expect(responseJson(response)).resolves.toMatchObject({
      error: expect.stringContaining('Required'),
    })
    expect(selectMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns 403 when PATCH design access check fails', async () => {
    accessQueryResult = []

    const response = await PATCH(jsonRequest({ id: 'design-1', name: 'Renamed scene' }))

    expect(response.status).toBe(403)
    await expect(responseJson(response)).resolves.toEqual({ error: 'Unauthorized' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('accepts a name-only PATCH rename and persists it through the update path', async () => {
    accessQueryResult = [
      {
        designId: 'design-1',
        projectId: 'project-1',
        projectUserId: 'user-1',
      },
    ]
    updatedDesignResult = [
      {
        id: 'design-1',
        projectId: 'project-1',
        userId: 'user-1',
        name: 'Renamed scene',
        sceneData: {
          walls: [],
          floors: [],
          water: [],
          surfaces: [],
          objects: [],
          activeLevel: 0,
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]

    const response = await PATCH(jsonRequest({ id: 'design-1', name: 'Renamed scene' }))
    const body = await responseJson(response)

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      id: 'design-1',
      name: 'Renamed scene',
    })
    expect(capturedUpdateValues).toMatchObject({
      name: 'Renamed scene',
    })
    expect(capturedUpdateValues).not.toHaveProperty('sceneData')
    expect(capturedUpdateValues?.updatedAt).toBeInstanceOf(Date)
  })
})
