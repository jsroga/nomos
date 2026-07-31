import { API_ERROR } from '@/shared/data/constants/api-errors'
import { StringSeparator } from '@/shared/data/constants/protocol'

export enum LegNextJobStatus {
  Completed = 'completed',
  Processing = 'processing',
  Pending = 'pending',
  Failed = 'failed',
}

export enum LegNextModelId {
  Diffusion = 'legnext-diffusion',
  UploadPaint = 'legnext-upload-paint',
  Upscale = 'legnext-upscale',
}

export enum LegNextErrorMessage {
  TaskTimedOut = 'LegNext task timed out',
}

export const LEGNEXT_ERROR_SEPARATOR = StringSeparator.CommaSpace
export const LEGNEXT_UNKNOWN_ERROR = API_ERROR.UNKNOWN_ERROR
