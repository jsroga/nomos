'use client'

import { isActiveTaskStatus } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import type { HttpTriggerRunStatus } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  waitForTriggerRun,
  TriggerRunPollAbortedError,
  TriggerRunPollFailedError,
  type WaitForTriggerRunOptions,
} from '@/shared/data/polling/wait-for-trigger-run'

const TRIGGER_RUN_COMPLETED_STATUS = 'COMPLETED'
const TRIGGER_RUN_NOT_FOUND_STATUS = 'NOT_FOUND'

export interface PollTrigger3dRunHandlers {
  shouldAbort?: () => boolean
  onPoll: (data: HttpTriggerRunStatus & { metadata?: Record<string, unknown> }) => void
  on404: () => void | Promise<void>
  onCompleted: (data: HttpTriggerRunStatus & { metadata?: Record<string, unknown> }) => void | Promise<void>
  onFailed: (data: HttpTriggerRunStatus & { metadata?: Record<string, unknown> }) => void | Promise<void>
}

export async function pollTrigger3dRun(
  runId: string,
  fetchStatus: (runId: string) => Promise<HttpTriggerRunStatus>,
  handlers: PollTrigger3dRunHandlers,
  options?: Pick<WaitForTriggerRunOptions, 'intervalMs' | 'maxPolls'>
): Promise<void> {
  try {
    const result = await waitForTriggerRun(
      createTriggerRunStatusFetch(fetchStatus, runId, { failOnFirst404: true }),
      {
        intervalMs: options?.intervalMs,
        maxPolls: options?.maxPolls,
        shouldAbort: handlers.shouldAbort,
        onPoll: data => {
          handlers.onPoll({
            status: data.status,
            output: data.output,
            error: data.error,
            metadata: data.metadata,
          })
        },
      }
    )

    const payload = {
      status: result.status,
      output: result.output,
      error: result.error,
      metadata: result.metadata,
    }

    if (result.status === TRIGGER_RUN_COMPLETED_STATUS) {
      await handlers.onCompleted(payload)
      return
    }

    if (!result.status || !isActiveTaskStatus(result.status)) {
      await handlers.onFailed(payload)
    }
  } catch (error) {
    if (error instanceof TriggerRunPollAbortedError) {
      return
    }
    if (error instanceof TriggerRunPollFailedError && error.status === TRIGGER_RUN_NOT_FOUND_STATUS) {
      await handlers.on404()
      return
    }
    if (error instanceof TriggerRunPollFailedError) {
      await handlers.onFailed({
        status: error.status,
        error: error.runError,
      })
      return
    }
    throw error
  }
}
