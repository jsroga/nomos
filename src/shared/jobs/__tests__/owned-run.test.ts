import { beforeEach, describe, expect, it, vi } from 'vitest'

const retrieveMock = vi.fn()
const triggerMock = vi.fn()
const cancelMock = vi.fn()
const verifyProjectAccessMock = vi.fn()

vi.mock('@trigger.dev/sdk', () => ({
  runs: {
    retrieve: (...args: unknown[]) => retrieveMock(...args),
    cancel: (...args: unknown[]) => cancelMock(...args),
  },
  tasks: { trigger: (...args: unknown[]) => triggerMock(...args) },
}))

vi.mock('@/shared/auth/project-access', () => ({
  verifyProjectAccess: (...args: unknown[]) => verifyProjectAccessMock(...args),
}))

import {
  JobAccessError,
  OWNED_RUN_SUMMARY_KEYS,
  projectIdFromRun,
  projectTag,
  retrieveOwnedRun,
  triggerOwnedRun,
} from '../owned-run'

const OWNER = '11111111-1111-4111-8111-111111111111'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const RUN_ID = 'run_abc123'

function runFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    status: 'COMPLETED',
    output: { imageUrl: 'https://example.test/secret.png' },
    error: undefined,
    metadata: { stage: 'completed' },
    tags: [projectTag(PROJECT)],
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
    finishedAt: new Date(),
    // A field the SDK may add later — must never reach the caller.
    payload: { apiKey: 'sk-should-never-be-returned' },
    ...overrides,
  }
}

beforeEach(() => {
  retrieveMock.mockReset()
  cancelMock.mockReset()
  triggerMock.mockReset()
  verifyProjectAccessMock.mockReset()
})

describe('retrieveOwnedRun', () => {
  it('throws when the caller does not own the tagged project', async () => {
    retrieveMock.mockResolvedValue(runFixture())
    verifyProjectAccessMock.mockResolvedValue(false)

    await expect(retrieveOwnedRun(RUN_ID, OWNER)).rejects.toBeInstanceOf(JobAccessError)
    expect(verifyProjectAccessMock).toHaveBeenCalledWith(PROJECT, OWNER)
  })

  it('returns the summary when the caller owns the tagged project', async () => {
    retrieveMock.mockResolvedValue(runFixture())
    verifyProjectAccessMock.mockResolvedValue(true)

    const summary = await retrieveOwnedRun(RUN_ID, OWNER)
    expect(summary.id).toBe(RUN_ID)
    expect(summary.status).toBe('COMPLETED')
  })

  it('returns only the allowlisted keys, never the whole SDK object', async () => {
    retrieveMock.mockResolvedValue(runFixture())
    verifyProjectAccessMock.mockResolvedValue(true)

    const summary = await retrieveOwnedRun(RUN_ID, OWNER)
    expect(Object.keys(summary).sort()).toEqual([...OWNED_RUN_SUMMARY_KEYS].sort())
    expect(summary).not.toHaveProperty('payload')
  })

  it('throws when the run is missing', async () => {
    retrieveMock.mockResolvedValue(null)
    await expect(retrieveOwnedRun(RUN_ID, OWNER)).rejects.toBeInstanceOf(JobAccessError)
    expect(verifyProjectAccessMock).not.toHaveBeenCalled()
  })

  it('refuses an untagged run however recent, now the grace window is gone', async () => {
    retrieveMock.mockResolvedValue(runFixture({ tags: [], metadata: {}, createdAt: new Date() }))

    await expect(retrieveOwnedRun(RUN_ID, OWNER)).rejects.toBeInstanceOf(JobAccessError)
    expect(verifyProjectAccessMock).not.toHaveBeenCalled()
  })

  it('falls back to metadata.projectId when the run predates tagging', async () => {
    retrieveMock.mockResolvedValue(
      runFixture({ tags: [], metadata: { projectId: PROJECT } })
    )
    verifyProjectAccessMock.mockResolvedValue(false)

    await expect(retrieveOwnedRun(RUN_ID, OWNER)).rejects.toBeInstanceOf(JobAccessError)
    expect(verifyProjectAccessMock).toHaveBeenCalledWith(PROJECT, OWNER)
  })
})

describe('projectIdFromRun', () => {
  it('reads the project tag', () => {
    expect(projectIdFromRun({ tags: [projectTag(PROJECT)], metadata: {} })).toBe(PROJECT)
  })

  it('ignores unrelated tags', () => {
    expect(projectIdFromRun({ tags: ['user:abc', 'tile'], metadata: {} })).toBeNull()
  })

  it('rejects a tag whose value is not a uuid', () => {
    expect(projectIdFromRun({ tags: ['project:not-a-uuid'], metadata: {} })).toBeNull()
  })
})

describe('triggerOwnedRun', () => {
  it('stamps the project tag derived from the payload', async () => {
    triggerMock.mockResolvedValue({ id: RUN_ID })

    await triggerOwnedRun('generate-tile', { projectId: PROJECT, x: 1 })

    expect(triggerMock).toHaveBeenCalledWith(
      'generate-tile',
      { projectId: PROJECT, x: 1 },
      expect.objectContaining({ tags: [projectTag(PROJECT)] })
    )
  })

  it('preserves caller options such as ttl', async () => {
    triggerMock.mockResolvedValue({ id: RUN_ID })

    await triggerOwnedRun('generate-tile', { projectId: PROJECT }, { ttl: '10m' })

    expect(triggerMock).toHaveBeenCalledWith(
      'generate-tile',
      { projectId: PROJECT },
      { ttl: '10m', tags: [projectTag(PROJECT)] }
    )
  })

  it('merges the project tag with caller-supplied tags', async () => {
    triggerMock.mockResolvedValue({ id: RUN_ID })

    await triggerOwnedRun('generate-tile', { projectId: PROJECT }, { tags: ['upscale'] })

    expect(triggerMock).toHaveBeenCalledWith(
      'generate-tile',
      { projectId: PROJECT },
      { tags: ['upscale', projectTag(PROJECT)] }
    )
  })

  it('refuses to trigger a run with no project id — an untaggable run is unreadable', async () => {
    await expect(triggerOwnedRun('generate-tile', { x: 1 })).rejects.toBeInstanceOf(JobAccessError)
    expect(triggerMock).not.toHaveBeenCalled()
  })
})

describe('cancelOwnedRun', () => {
  it('refuses to cancel a run the caller does not own', async () => {
    retrieveMock.mockResolvedValue(runFixture())
    verifyProjectAccessMock.mockResolvedValue(false)

    const { cancelOwnedRun } = await import('../owned-run')
    await expect(cancelOwnedRun(RUN_ID, OWNER)).rejects.toBeInstanceOf(JobAccessError)
    expect(cancelMock).not.toHaveBeenCalled()
  })

  it('cancels a run the caller owns', async () => {
    retrieveMock.mockResolvedValue(runFixture())
    verifyProjectAccessMock.mockResolvedValue(true)

    const { cancelOwnedRun } = await import('../owned-run')
    await cancelOwnedRun(RUN_ID, OWNER)
    expect(cancelMock).toHaveBeenCalledWith(RUN_ID)
  })
})
