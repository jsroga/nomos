import {
  isFailedTaskStatus,
  isSuccessTaskStatus,
} from '@/shared/data/constants/polling'
import { readString } from '@/shared/data/json-guards'

export interface TriggerRunStatusPayload {
  status?: string | null
  output?: Record<string, unknown>
  error?: unknown
  metadata?: Record<string, unknown>
}

/** Default max poll count at 5s intervals — 60 × 5s = 5 minutes. */
export const TRIGGER_RUN_DEFAULT_MAX_POLLS = 60

export function shouldStopTriggerRunPolling(
  data: TriggerRunStatusPayload | undefined,
  pollCount: number,
  maxPolls = TRIGGER_RUN_DEFAULT_MAX_POLLS
): boolean {
  if (pollCount >= maxPolls) return true
  const status = data?.status
  if (!status) return false
  if (isSuccessTaskStatus(status)) return true
  if (isFailedTaskStatus(status)) return true
  if (data?.error != null) return true
  return false
}

export function isTriggerRunSuccess(data: TriggerRunStatusPayload | undefined): boolean {
  const status = data?.status
  return Boolean(status && isSuccessTaskStatus(status))
}

export function isTriggerRunFailure(data: TriggerRunStatusPayload | undefined): boolean {
  const status = data?.status
  if (status && isFailedTaskStatus(status)) return true
  return data?.error != null
}

export function readTriggerRunOutputField(
  data: TriggerRunStatusPayload,
  field: string
): string | null {
  const output = data.output
  if (!output) return null
  return readString(output[field]) ?? null
}
