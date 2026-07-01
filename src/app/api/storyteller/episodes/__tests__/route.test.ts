import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuthMock = vi.fn()
const verifyProjectAccessMock = vi.fn()
const selectMock = vi.fn()
const insertMock = vi.fn()
const eqMock = vi.fn((field: unknown, value: unknown) => ({ field, value }))
const ascMock = vi.fn((field: unknown) => field)

vi.mock('@/lib/auth', () => ({
  requireAuth: () => requireAuthMock(),
}))

vi.mock('@/shared/auth', () => ({
  verifyProjectAccess: (...args: unknown[]) => verifyProjectAccessMock(...args),
}))

vi.mock('drizzle-orm', () => ({
  eq: (...args: unknown[]) => eqMock(...args),
  asc: (...args: unknown[]) => ascMock(...args),
}))

vi.mock('@/db', () => ({
  episodes: {
    projectId: 'episodes.projectId',
    sequence: 'episodes.sequence',
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
  },
}))

function createJsonRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
}

describe('storyteller episodes route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when GET is missing projectId', async () => {
    const { GET } = await import('../route')

    const response = await GET(createJsonRequest('http://localhost/api/storyteller/episodes'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Project ID is required',
    })
  })

  it('returns the typed episode list for an authorized GET request', async () => {
    const orderedEpisodes = [
      { id: 'ep-1', title: 'Pilot', sequence: 1 },
      { id: 'ep-2', title: null, sequence: 2 },
    ]

    requireAuthMock.mockResolvedValue({
      session: { user: { id: 'user-1' } },
    })
    verifyProjectAccessMock.mockResolvedValue(true)
    selectMock.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue(orderedEpisodes),
        })),
      })),
    })

    const { GET } = await import('../route')
    const response = await GET(
      createJsonRequest('http://localhost/api/storyteller/episodes?projectId=project-1')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(orderedEpisodes)
    expect(verifyProjectAccessMock).toHaveBeenCalledWith('project-1', 'user-1')
    expect(eqMock).toHaveBeenCalledWith('episodes.projectId', 'project-1')
    expect(ascMock).toHaveBeenCalledWith('episodes.sequence')
  })

  it('returns 403 when GET project access is denied', async () => {
    requireAuthMock.mockResolvedValue({
      session: { user: { id: 'user-1' } },
    })
    verifyProjectAccessMock.mockResolvedValue(false)

    const { GET } = await import('../route')
    const response = await GET(
      createJsonRequest('http://localhost/api/storyteller/episodes?projectId=project-1')
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized access to project',
    })
  })

  it('returns 400 when POST body fails DTO validation', async () => {
    requireAuthMock.mockResolvedValue({
      session: { user: { id: 'user-1' } },
    })

    const { POST } = await import('../route')
    const response = await POST(
      createJsonRequest('http://localhost/api/storyteller/episodes', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          title: '',
          sequence: 1,
        }),
      })
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid episode payload')
    expect(body.details.fieldErrors.title).toBeDefined()
  })

  it('inserts a new episode with camelCase fields on POST', async () => {
    requireAuthMock.mockResolvedValue({
      session: { user: { id: 'user-1' } },
    })
    verifyProjectAccessMock.mockResolvedValue(true)

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: 'ep-1',
        projectId: 'project-1',
        title: 'Pilot',
        sequence: 1,
        masterPrompt: 'Write cinematically',
        summary: 'Opening episode',
      },
    ])
    const valuesMock = vi.fn(() => ({
      returning: returningMock,
    }))
    insertMock.mockReturnValue({
      values: valuesMock,
    })

    const { POST } = await import('../route')
    const response = await POST(
      createJsonRequest('http://localhost/api/storyteller/episodes', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          title: 'Pilot',
          sequence: 1,
          masterPrompt: 'Write cinematically',
          summary: 'Opening episode',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(verifyProjectAccessMock).toHaveBeenCalledWith('project-1', 'user-1')
    expect(valuesMock).toHaveBeenCalledWith({
      projectId: 'project-1',
      title: 'Pilot',
      sequence: 1,
      masterPrompt: 'Write cinematically',
      summary: 'Opening episode',
      status: 'planning',
    })
    await expect(response.json()).resolves.toMatchObject({
      id: 'ep-1',
      title: 'Pilot',
    })
  })
})
