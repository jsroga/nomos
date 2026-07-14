/** Beat image generation client service wire values. */

export enum BeatImageProvider {
  NanoBanana = 'nanobanana',
}

export const BEAT_IMAGE_MODEL_STORAGE_KEY = 'NANO_BANANA_MODEL_ID'
export const BEAT_IMAGE_DEFAULT_MODEL_ID = 'flu-pro'

export const BEAT_IMAGE_ERROR_PROMPT = 'Failed to generate image prompt'
export const BEAT_IMAGE_ERROR_MISSING_API_KEY = 'Missing Nano Banana (Gemini) API Key'
export const BEAT_IMAGE_ERROR_TRIGGER = 'Failed to trigger beat image generation'
export const BEAT_IMAGE_ERROR_NO_HANDLE = 'No handleId returned from trigger'
export const BEAT_IMAGE_ERROR_TASK_TIMEOUT = 'Task timed out'
export const BEAT_IMAGE_LOG_POLLING_ERROR = 'Polling error:'
export const BEAT_IMAGE_LOG_GENERATION_FAILED = 'Failed to generate beat image:'
export const BEAT_IMAGE_LOG_COMPLETE = '✅ Generation complete!'

export enum BeatImageTriggerStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Canceled = 'CANCELED',
}
