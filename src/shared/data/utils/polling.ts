export {
  ACTIVE_TASK_STATUSES,
  FAILED_STATUSES,
  POLLING_INTERVALS,
  SUCCESS_STATUSES,
  TRIGGER_STATUS_FETCH_INIT,
} from '../constants/polling'
import { ACTIVE_TASK_STATUSES, FAILED_STATUSES, SUCCESS_STATUSES } from '../constants/polling'

export const isActiveTaskStatus = (status: string): boolean =>
  ACTIVE_TASK_STATUSES.some(activeStatus => activeStatus === status.toUpperCase())

export const isSuccessTaskStatus = (status: string): boolean =>
  SUCCESS_STATUSES.some(successStatus => successStatus === status.toUpperCase())

export const isFailedTaskStatus = (status: string): boolean =>
  FAILED_STATUSES.some(failedStatus => failedStatus === status.toUpperCase())
