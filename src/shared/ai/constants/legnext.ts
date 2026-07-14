import { API_ERROR } from '@/shared/data/constants/api-errors'
import { StringSeparator } from '@/shared/data/constants/protocol'

export enum LegNextJobStatus {
  Completed = 'completed',
  Failed = 'failed',
}

export enum LegNextErrorMessage {
  TaskTimedOut = 'LegNext task timed out',
}

export const LEGNEXT_ERROR_SEPARATOR = StringSeparator.CommaSpace
export const LEGNEXT_UNKNOWN_ERROR = API_ERROR.UNKNOWN_ERROR
