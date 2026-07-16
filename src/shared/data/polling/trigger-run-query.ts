'use client'

import {
  isActiveTaskStatus,
  POLLING_INTERVALS,
} from '@/shared/data/constants/polling'

import {
  shouldStopTriggerRunPolling,
  TRIGGER_RUN_DEFAULT_MAX_POLLS,
  type TriggerRunStatusPayload,
} from './trigger-run-polling'

export {
  shouldStopTriggerRunPolling,
  TRIGGER_RUN_DEFAULT_MAX_POLLS,
  type TriggerRunStatusPayload,
} from './trigger-run-polling'

interface TriggerRunPollQueryState {
  data?: TriggerRunStatusPayload
  dataUpdateCount: number
}

export function triggerRunRefetchInterval(
  query: { state: TriggerRunPollQueryState },
  maxPolls = TRIGGER_RUN_DEFAULT_MAX_POLLS
): number | false {
  const data = query.state.data
  const pollCount = query.state.dataUpdateCount

  if (shouldStopTriggerRunPolling(data, pollCount, maxPolls)) {
    return false
  }

  const status = data?.status
  if (!status || isActiveTaskStatus(status)) {
    return POLLING_INTERVALS.DEFAULT
  }

  return false
}
