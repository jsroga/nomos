/** Beat image generation client service wire values. */

import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export const BeatImageProvider = {
  NanoBanana: ImageGenProvider.NanoBanana,
} as const

export type BeatImageProvider = (typeof BeatImageProvider)[keyof typeof BeatImageProvider]

export const BEAT_IMAGE_MODEL_STORAGE_KEY = 'NANO_BANANA_MODEL_ID'
export const BEAT_IMAGE_DEFAULT_MODEL_ID = 'flu-pro'

export const BEAT_IMAGE_ERROR_PROMPT = 'Failed to generate image prompt'
export const BEAT_IMAGE_ERROR_MISSING_API_KEY = 'Missing Nano Banana (Gemini) API Key'
export const BEAT_IMAGE_ERROR_TRIGGER = 'Failed to trigger beat image generation'
export const BEAT_IMAGE_ERROR_NO_HANDLE = 'No handleId returned from trigger'
export const BEAT_IMAGE_ERROR_TASK_TIMEOUT = 'Task timed out'
export const BEAT_IMAGE_ERROR_NO_IMAGE = 'Beat image generation completed without an image'
export const BEAT_IMAGE_TOAST_FAILED = 'Beat image generation failed'
export const BEAT_IMAGE_LOG_POLLING_ERROR = 'Polling error:'
export const BEAT_IMAGE_LOG_GENERATION_FAILED = 'Failed to generate beat image:'
export const BEAT_IMAGE_LOG_COMPLETE = '✅ Generation complete!'

export enum BeatImageStorageKeyPrefix {
  BeatImageGen = 'beat-image-gen-',
}

export enum BeatImageOperationLabel {
  GeneratingBeatImage = 'Generating Beat Image',
}

export enum BeatImageOperationDetail {
  CreatingStoryboard = 'Creating storyboard frame...',
  StatusPrefix = 'Status: ',
}

export function beatImageOperationId(beatId: string): string {
  return `${BeatImageStorageKeyPrefix.BeatImageGen}${beatId}`
}

export enum BeatImageTriggerStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Canceled = 'CANCELED',
}
