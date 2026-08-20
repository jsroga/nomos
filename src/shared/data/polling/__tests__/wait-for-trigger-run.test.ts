import { describe, expect, it, vi } from 'vitest'

import {
  TriggerRunPollAbortedError,
  TriggerRunPollFailedError,
  TriggerRunPollTimeoutError,
  waitForTriggerRun,
} from '@/shared/data/polling/wait-for-trigger-run'

describe('waitForTriggerRun', () => {
  it('returns when the run completes successfully', async () => {
    vi.useFakeTimers()

    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({ status: 'EXECUTING' })
      .mockResolvedValueOnce({ status: 'COMPLETED', output: { imageUrl: 'https://x.test/a.png' } })

    const resultPromise = waitForTriggerRun(fetchStatus, { intervalMs: 100, maxPolls: 5 })

    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.status).toBe('COMPLETED')
    expect(fetchStatus).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('throws when the run fails', async () => {
    const fetchStatus = vi.fn().mockResolvedValue({ status: 'FAILED', error: 'boom' })

    await expect(waitForTriggerRun(fetchStatus, { intervalMs: 1, maxPolls: 3 })).rejects.toBeInstanceOf(
      TriggerRunPollFailedError
    )
  })

  it('throws when polling exceeds maxPolls', async () => {
    vi.useFakeTimers()

    const fetchStatus = vi.fn().mockResolvedValue({ status: 'EXECUTING' })

    const resultPromise = waitForTriggerRun(fetchStatus, { intervalMs: 100, maxPolls: 2 })
    const expectation = expect(resultPromise).rejects.toBeInstanceOf(TriggerRunPollTimeoutError)

    await vi.runAllTimersAsync()
    await expectation
    expect(fetchStatus).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('aborts during the poll interval when shouldAbort becomes true', async () => {
    vi.useFakeTimers()

    let aborted = false
    const fetchStatus = vi.fn().mockResolvedValue({ status: 'EXECUTING' })
    const resultPromise = waitForTriggerRun(fetchStatus, {
      intervalMs: 5000,
      maxPolls: 5,
      shouldAbort: () => aborted,
    })
    const expectation = expect(resultPromise).rejects.toBeInstanceOf(TriggerRunPollAbortedError)

    await Promise.resolve()
    aborted = true
    await vi.advanceTimersByTimeAsync(50)
    await expectation

    vi.useRealTimers()
  })
})
