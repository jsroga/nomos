import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientFetchError } from '@/shared/data/fetch-json-record'
import { HttpStatus, UrlScheme } from '@/shared/data/constants/protocol'
import { TriggerActiveStatus, TriggerTerminalStatus } from '@/shared/jobs/constants/trigger-active-status'
import { fetchPosterRunStatus } from '@/domains/storyteller/core/io/poster.api'
import { PosterGenerationType, PosterStorageKeyPrefix } from '../constants/poster-generation-service'
import {
  trySettleStoredPosterRun,
  type PosterGenRunState,
} from '../poster-generation-resume'

vi.mock('@/domains/storyteller/core/io/poster.api', () => ({
  fetchPosterRunStatus: vi.fn(),
}))

const EPISODE_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'
const PROJECT_ID = '1f3c8a10-2b44-4c91-9e0a-7d2b1c4e8f90'
const RUN_ID = 'run-poster-1'
const POSTER_URL = `${UrlScheme.Https}://blob.example/poster.png`
const OP_KEY = `${PosterStorageKeyPrefix.PosterGen}${EPISODE_ID}`

function posterRun(baselinePosterUrl = ''): PosterGenRunState {
  return {
    runId: RUN_ID,
    projectId: PROJECT_ID,
    episodeId: EPISODE_ID,
    prompt: 'cinematic poster',
    startedAt: '2026-08-20T00:00:00.000Z',
    baselinePosterUrl,
    type: PosterGenerationType.Poster,
  }
}

function createHost(savedPosterUrl: string | null) {
  return {
    readCurrentPosterUrl: vi.fn(async () => savedPosterUrl),
    handleCompletion: vi.fn(async () => undefined),
    applyCompletedRun: vi.fn(async () => undefined),
    clearRunState: vi.fn(),
    pollRun: vi.fn(async () => undefined),
  }
}

describe('trySettleStoredPosterRun', () => {
  beforeEach(() => {
    vi.mocked(fetchPosterRunStatus).mockReset()
  })

  it('settles from the episode row when the saved poster is newer than baseline', async () => {
    const host = createHost(POSTER_URL)
    const settled = await trySettleStoredPosterRun(host, posterRun(''), OP_KEY, {})

    expect(settled).toBe(true)
    expect(host.handleCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
      POSTER_URL,
      OP_KEY,
      undefined,
      false,
    )
    expect(fetchPosterRunStatus).not.toHaveBeenCalled()
    expect(host.pollRun).not.toHaveBeenCalled()
  })

  it('settles a completed trigger run even when the poster url matches baseline', async () => {
    const host = createHost(POSTER_URL)
    vi.mocked(fetchPosterRunStatus).mockResolvedValue({
      status: TriggerTerminalStatus.Completed,
      output: { imageUrl: POSTER_URL },
    })

    const settled = await trySettleStoredPosterRun(host, posterRun(POSTER_URL), OP_KEY, {})

    expect(settled).toBe(true)
    expect(host.applyCompletedRun).toHaveBeenCalledOnce()
    expect(host.pollRun).not.toHaveBeenCalled()
  })

  it('settles a missing trigger run when the episode already has a poster', async () => {
    const host = createHost(POSTER_URL)
    vi.mocked(fetchPosterRunStatus).mockRejectedValue(
      new ClientFetchError('missing', HttpStatus.NOT_FOUND),
    )

    const settled = await trySettleStoredPosterRun(host, posterRun(POSTER_URL), OP_KEY, {})

    expect(settled).toBe(true)
    expect(host.handleCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
      POSTER_URL,
      OP_KEY,
      undefined,
      false,
    )
    expect(host.pollRun).not.toHaveBeenCalled()
  })

  it('keeps polling while the trigger run is still executing and the poster is unchanged', async () => {
    const host = createHost(POSTER_URL)
    vi.mocked(fetchPosterRunStatus).mockResolvedValue({
      status: TriggerActiveStatus.Executing,
    })

    const settled = await trySettleStoredPosterRun(host, posterRun(POSTER_URL), OP_KEY, {})

    expect(settled).toBe(false)
    expect(host.handleCompletion).not.toHaveBeenCalled()
    expect(host.applyCompletedRun).not.toHaveBeenCalled()
  })
})
