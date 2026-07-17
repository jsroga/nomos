'use client'

import { isActiveTaskStatus, isSuccessTaskStatus } from '@/shared/data/constants/polling'
import { recordFromJson } from '@/shared/data/json-guards'
import {
  waitForTriggerRun,
  type TriggerRunStatusPayload,
  type WaitForTriggerRunOptions,
} from '@/shared/data/polling/wait-for-trigger-run'

export interface InteriorTriggerStatus {
  status: string
  output?: Record<string, unknown> | null
  error?: unknown
  metadata?: Record<string, unknown>
}

export interface PollInteriorTriggerRunHandlers {
  shouldAbort?: () => boolean
  onPoll?: (data: TriggerRunStatusPayload & { metadata?: Record<string, unknown> }) => void
  onCompleted: (
    data: TriggerRunStatusPayload & { metadata?: Record<string, unknown> }
  ) => void | Promise<void>
  onFailed: (
    data: TriggerRunStatusPayload & { metadata?: Record<string, unknown> }
  ) => void | Promise<void>
}

function toTriggerPayload(
  data: InteriorTriggerStatus
): TriggerRunStatusPayload & { metadata?: Record<string, unknown> } {
  return {
    status: data.status,
    output: data.output ? recordFromJson(data.output) : undefined,
    error: data.error,
    metadata: data.metadata,
  }
}

/**
 * Poll an interior-designer Trigger.dev status endpoint until terminal.
 * Replaces setInterval loops in Retexture / TextTo3D / SurfaceProperties.
 */
export async function pollInteriorTriggerRun(
  fetchStatus: () => Promise<InteriorTriggerStatus>,
  handlers: PollInteriorTriggerRunHandlers,
  options?: Pick<WaitForTriggerRunOptions, 'intervalMs' | 'maxPolls'>
): Promise<void> {
  try {
    const result = await waitForTriggerRun(
      async () => toTriggerPayload(await fetchStatus()),
      {
        intervalMs: options?.intervalMs,
        maxPolls: options?.maxPolls,
        shouldAbort: handlers.shouldAbort,
        onPoll: data => {
          handlers.onPoll?.(data)
        },
      }
    )

    const payload = {
      status: result.status,
      output: result.output,
      error: result.error,
      metadata: result.metadata,
    }

    if (result.status && isSuccessTaskStatus(result.status)) {
      await handlers.onCompleted(payload)
      return
    }

    if (!result.status || !isActiveTaskStatus(result.status)) {
      await handlers.onFailed(payload)
    }
  } catch (error) {
    await handlers.onFailed({
      status: null,
      output: undefined,
      error,
    })
  }
}
