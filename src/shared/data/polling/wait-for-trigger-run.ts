import { POLLING_INTERVALS } from '@/shared/data/constants/polling'

import {
  isTriggerRunFailure,
  isTriggerRunSuccess,
  shouldStopTriggerRunPolling,
  TRIGGER_RUN_DEFAULT_MAX_POLLS,
  type TriggerRunStatusPayload,
} from './trigger-run-polling'

export {
  TRIGGER_RUN_DEFAULT_MAX_POLLS,
  type TriggerRunStatusPayload,
} from './trigger-run-polling'

export class TriggerRunPollTimeoutError extends Error {
  constructor(message = 'Trigger run polling timed out') {
    super(message)
    this.name = 'TriggerRunPollTimeoutError'
  }
}

export class TriggerRunPollFailedError extends Error {
  readonly status: string | null | undefined
  readonly runError: unknown

  constructor(status: string | null | undefined, runError: unknown, message?: string) {
    super(message ?? `Trigger run failed with status: ${status ?? 'unknown'}`)
    this.name = 'TriggerRunPollFailedError'
    this.status = status
    this.runError = runError
  }
}

export class TriggerRunPollAbortedError extends Error {
  constructor(message = 'Trigger run polling aborted') {
    super(message)
    this.name = 'TriggerRunPollAbortedError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export interface WaitForTriggerRunOptions {
  intervalMs?: number
  maxPolls?: number
  onPoll?: (data: TriggerRunStatusPayload, pollCount: number) => void
  onFetchError?: (error: unknown, pollCount: number) => void
  shouldAbort?: () => boolean
}

/**
 * Imperative Trigger.dev run polling for services (non-React).
 * React UI should prefer TanStack Query + triggerRunRefetchInterval instead.
 */
export async function waitForTriggerRun(
  fetchStatus: () => Promise<TriggerRunStatusPayload>,
  options: WaitForTriggerRunOptions = {}
): Promise<TriggerRunStatusPayload> {
  const intervalMs = options.intervalMs ?? POLLING_INTERVALS.DEFAULT
  const maxPolls = options.maxPolls ?? TRIGGER_RUN_DEFAULT_MAX_POLLS

  const poll = async (pollCount: number): Promise<TriggerRunStatusPayload> => {
    if (options.shouldAbort?.()) {
      throw new TriggerRunPollAbortedError()
    }

    const nextPollCount = pollCount + 1
    let data: TriggerRunStatusPayload | undefined

    try {
      data = await fetchStatus()
      options.onPoll?.(data, nextPollCount)
    } catch (error) {
      options.onFetchError?.(error, nextPollCount)
      if (nextPollCount >= maxPolls) {
        throw new TriggerRunPollTimeoutError()
      }
      await sleep(intervalMs)
      return poll(nextPollCount)
    }

    if (shouldStopTriggerRunPolling(data, nextPollCount, maxPolls)) {
      if (isTriggerRunSuccess(data)) {
        return data
      }
      if (isTriggerRunFailure(data)) {
        throw new TriggerRunPollFailedError(data.status, data.error)
      }
      throw new TriggerRunPollTimeoutError()
    }

    await sleep(intervalMs)
    return poll(nextPollCount)
  }

  return poll(0)
}
