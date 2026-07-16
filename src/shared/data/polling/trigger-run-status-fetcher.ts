import type { TriggerRunStatusPayload } from './trigger-run-polling'
import { TriggerRunPollFailedError } from './wait-for-trigger-run'

const TRIGGER_STATUS_NOT_FOUND = 'NOT_FOUND'
const TRIGGER_STATUS_NOT_FOUND_MESSAGE = 'Trigger run not found'
const TRIGGER_STATUS_PENDING = 'PENDING'
const HTTP_STATUS_NOT_FOUND = 404

export interface HttpTriggerRunStatus extends TriggerRunStatusPayload {
  statusCode?: number
  metadata?: Record<string, unknown>
}

export interface CreateTriggerRunStatusFetchOptions {
  /** Retry this many 404s before failing (default 5). Set 0 with failOnFirst404 for immediate fail. */
  max404Retries?: number
  /** Fail on the first 404 instead of retrying. */
  failOnFirst404?: boolean
}

/**
 * Wraps a status endpoint that may return HTTP 404 while the run is still registering.
 * Use as the fetchStatus callback for waitForTriggerRun.
 */
export function createTriggerRunStatusFetch(
  fetchStatus: (runId: string) => Promise<HttpTriggerRunStatus>,
  runId: string,
  options: CreateTriggerRunStatusFetchOptions = {}
): () => Promise<TriggerRunStatusPayload & { metadata?: Record<string, unknown> }> {
  const max404Retries = options.failOnFirst404 ? 0 : (options.max404Retries ?? 5)
  let consecutive404 = 0

  return async () => {
    const data = await fetchStatus(runId)

    if (data.statusCode === HTTP_STATUS_NOT_FOUND) {
      consecutive404++
      if (consecutive404 > max404Retries) {
        throw new TriggerRunPollFailedError(
          TRIGGER_STATUS_NOT_FOUND,
          null,
          TRIGGER_STATUS_NOT_FOUND_MESSAGE
        )
      }
      return { status: TRIGGER_STATUS_PENDING, output: undefined, error: undefined }
    }

    consecutive404 = 0
    return {
      status: data.status,
      output: data.output,
      error: data.error,
      metadata: data.metadata,
    }
  }
}
