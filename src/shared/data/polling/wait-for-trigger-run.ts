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

const TRIGGER_POLL_TIMEOUT_MESSAGE = 'Trigger run polling timed out'
const TRIGGER_POLL_TIMEOUT_NAME = 'TriggerRunPollTimeoutError'
const TRIGGER_POLL_FAILED_NAME = 'TriggerRunPollFailedError'
const TRIGGER_POLL_ABORTED_MESSAGE = 'Trigger run polling aborted'
const TRIGGER_POLL_ABORTED_NAME = 'TriggerRunPollAbortedError'
const TRIGGER_POLL_UNKNOWN_STATUS = 'unknown'

export class TriggerRunPollTimeoutError extends Error {
  constructor(message = TRIGGER_POLL_TIMEOUT_MESSAGE) {
    super(message)
    this.name = TRIGGER_POLL_TIMEOUT_NAME
  }
}

export class TriggerRunPollFailedError extends Error {
  readonly status: string | null | undefined
  readonly runError: unknown

  constructor(status: string | null | undefined, runError: unknown, message?: string) {
    super(message ?? `Trigger run failed with status: ${status ?? TRIGGER_POLL_UNKNOWN_STATUS}`)
    this.name = TRIGGER_POLL_FAILED_NAME
    this.status = status
    this.runError = runError
  }
}

export class TriggerRunPollAbortedError extends Error {
  constructor(message = TRIGGER_POLL_ABORTED_MESSAGE) {
    super(message)
    this.name = TRIGGER_POLL_ABORTED_NAME
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const TRIGGER_POLL_ABORT_SLICE_MS = 50

async function sleepUntilInterval(
  intervalMs: number,
  shouldAbort?: () => boolean
): Promise<void> {
  const deadline = Date.now() + intervalMs
  while (Date.now() < deadline) {
    if (shouldAbort?.()) {
      throw new TriggerRunPollAbortedError()
    }
    const remaining = deadline - Date.now()
    await sleep(Math.min(TRIGGER_POLL_ABORT_SLICE_MS, remaining))
  }
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
      if (error instanceof TriggerRunPollAbortedError) throw error
      options.onFetchError?.(error, nextPollCount)
      if (nextPollCount >= maxPolls) {
        throw new TriggerRunPollTimeoutError()
      }
      await sleepUntilInterval(intervalMs, options.shouldAbort)
      return poll(nextPollCount)
    }

    if (options.shouldAbort?.()) {
      throw new TriggerRunPollAbortedError()
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

    await sleepUntilInterval(intervalMs, options.shouldAbort)
    return poll(nextPollCount)
  }

  return poll(0)
}
