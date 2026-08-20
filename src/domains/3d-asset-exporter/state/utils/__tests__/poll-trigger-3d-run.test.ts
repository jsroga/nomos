import { describe, expect, it, vi } from 'vitest'
import {
  TriggerRunPollAbortedError,
  TriggerRunPollFailedError,
  waitForTriggerRun,
} from '@/shared/data/polling/wait-for-trigger-run'
import { pollTrigger3dRun } from '../poll-trigger-3d-run'

vi.mock('@/shared/data/polling/wait-for-trigger-run', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/data/polling/wait-for-trigger-run')>()
  return {
    ...actual,
    waitForTriggerRun: vi.fn(),
  }
})

describe('pollTrigger3dRun', () => {
  it('swallows abort instead of rethrowing', async () => {
    vi.mocked(waitForTriggerRun).mockRejectedValueOnce(new TriggerRunPollAbortedError())
    const onFailed = vi.fn()
    await expect(
      pollTrigger3dRun(
        'run-1',
        async () => ({ status: 'EXECUTING' }),
        {
          onPoll: vi.fn(),
          on404: vi.fn(),
          onCompleted: vi.fn(),
          onFailed,
        },
      ),
    ).resolves.toBeUndefined()
    expect(onFailed).not.toHaveBeenCalled()
  })

  it('routes CANCELED to onFailed instead of throwing', async () => {
    vi.mocked(waitForTriggerRun).mockRejectedValueOnce(
      new TriggerRunPollFailedError('CANCELED', undefined),
    )
    const onFailed = vi.fn()
    await expect(
      pollTrigger3dRun(
        'run-1',
        async () => ({ status: 'CANCELED' }),
        {
          onPoll: vi.fn(),
          on404: vi.fn(),
          onCompleted: vi.fn(),
          onFailed,
        },
      ),
    ).resolves.toBeUndefined()
    expect(onFailed).toHaveBeenCalledWith({
      status: 'CANCELED',
      error: undefined,
    })
  })

  it('routes NOT_FOUND failures to on404', async () => {
    vi.mocked(waitForTriggerRun).mockRejectedValueOnce(
      new TriggerRunPollFailedError('NOT_FOUND', undefined),
    )
    const on404 = vi.fn()
    await pollTrigger3dRun(
      'run-1',
      async () => ({ status: 'NOT_FOUND' }),
      {
        onPoll: vi.fn(),
        on404,
        onCompleted: vi.fn(),
        onFailed: vi.fn(),
      },
    )
    expect(on404).toHaveBeenCalledTimes(1)
  })
})
