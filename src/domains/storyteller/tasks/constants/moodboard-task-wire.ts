/**
 * Moodboard Trigger task — domain-only wire + shared protocol/model aliases.
 * Prefer importing {@link ImageGenProvider}, {@link ApiframeImageModel}, etc. at call sites.
 */

import {
  BufferEncoding,
  ContentType,
  FsDirectory,
  GoogleModelId,
  HttpMethod,
} from '@/shared/data/constants/protocol'
import { GeminiResponseModality } from '@/shared/data/constants/repaint-gemini'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'

export const MOODBOARD_TASK_ID = 'generate-moodboard'

export const MOODBOARD_PROVIDER_MIDJOURNEY = ImageGenProvider.Midjourney
export const MOODBOARD_PROVIDER_NANOBANANA = ImageGenProvider.NanoBanana
export const MOODBOARD_LLM_PROVIDER_MIDJOURNEY = ImageGenProvider.Midjourney
export const MOODBOARD_LLM_PROVIDER_GEMINI = ImageGenProvider.Gemini

export const MOODBOARD_LLM_MODEL_MIDJOURNEY = ApiframeImageModel.Midjourney
export const MOODBOARD_DEFAULT_GEMINI_MODEL =
  GoogleModelId.Gemini20FlashPreviewImageGeneration

export const MOODBOARD_HTTP_POST = HttpMethod.Post
export const MOODBOARD_HTTP_GET = HttpMethod.Get
export const MOODBOARD_CONTENT_TYPE_JSON = ContentType.Json
export const MOODBOARD_ENCODING_BASE64 = BufferEncoding.Base64
export const MOODBOARD_PUBLIC_DIR = FsDirectory.Public
export const MOODBOARD_PROJECTS_DIR = FsDirectory.Projects
export const MOODBOARD_RESPONSE_MODALITY_TEXT = GeminiResponseModality.Text
export const MOODBOARD_RESPONSE_MODALITY_IMAGE = GeminiResponseModality.Image

export enum MoodboardStage {
  Downloading = 'downloading_image',
  Submitting = 'submitting_diffusion',
  Waiting = 'waiting_diffusion',
  Saving = 'saving_image',
  UpdatingDb = 'updating_database',
  Completed = 'completed',
  Initializing = 'initializing',
}

export const MOODBOARD_STAGE_DOWNLOADING = MoodboardStage.Downloading
export const MOODBOARD_STAGE_SUBMITTING = MoodboardStage.Submitting
export const MOODBOARD_STAGE_WAITING = MoodboardStage.Waiting
export const MOODBOARD_STAGE_SAVING = MoodboardStage.Saving
export const MOODBOARD_STAGE_UPDATING_DB = MoodboardStage.UpdatingDb
export const MOODBOARD_STAGE_COMPLETED = MoodboardStage.Completed
export const MOODBOARD_STAGE_INITIALIZING = MoodboardStage.Initializing

export const MOODBOARD_LLM_TASK = 'moodboard-generation'
export const MOODBOARD_PROMPT_SUFFIX =
  '. Concept art, high fidelity, moody, cinematic lighting.'
export const MOODBOARD_BASE64_LABEL = '[Base64 Image Data]'
export const MOODBOARD_APPEND_INDEX = 'append'
export const MOODBOARD_PROJECT_NOT_FOUND = 'Project not found'
export const MOODBOARD_DB_UPDATED = 'Updated DB with moodImages (Synced both tables)'
export const MOODBOARD_APIFRAME_NO_JOB = 'No jobId returned'
export const MOODBOARD_APIFRAME_NO_IMAGE = 'Result missing images'
export const MOODBOARD_GEMINI_NO_IMAGE = 'No image returned in response'
export const MOODBOARD_UNKNOWN_ERROR = 'Unknown error'
export const MOODBOARD_TABLE_PROJECTS = 'projects'
export const MOODBOARD_TABLE_STORY_PLANS = 'story_plans'
export const MOODBOARD_COL_ID = 'id'
export const MOODBOARD_COL_PROJECT_ID = 'project_id'
export const MOODBOARD_COL_CONTENT = 'content'
export const MOODBOARD_COL_STORY_PLAN = 'story_plan'
export const MOODBOARD_COL_UPDATED_AT = 'updated_at'
export const MOODBOARD_METADATA_PROGRESS = 'progress'
export const MOODBOARD_METADATA_STAGE = 'stage'
export const MOODBOARD_METADATA_PROJECT_ID = 'project_id'
export const MOODBOARD_METADATA_PROVIDER = 'provider'
export const MOODBOARD_METADATA_DIFFUSION_JOB_ID = 'diffusion_job_id'
export const MOODBOARD_INLINE_DATA_KEY = 'data'
export const MOODBOARD_IMAGE_GEN_FAILED = 'Failed to generate image for prompt'
export const MOODBOARD_COMMA_JOIN = ', '
export const MOODBOARD_MOOD_IMAGES_KEY = 'moodImages'
