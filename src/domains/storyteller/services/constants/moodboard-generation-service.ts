/** Moodboard generation client service wire values. */

import {
  StorytellerGlobalOperation,
  StorytellerHttpMethod,
  StorytellerMoodboardProvider,
} from '@/domains/storyteller/core/storyteller-page-wire'
import {
  BEAT_IMAGE_DEFAULT_MODEL_ID,
  BEAT_IMAGE_MODEL_STORAGE_KEY,
  BeatImageTriggerStatus,
} from '@/domains/storyteller/services/constants/beat-image-service'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'

export { StorytellerMoodboardProvider as MoodboardProvider }
export { StorytellerGlobalOperation as MoodboardOperationType }
export { StorytellerHttpMethod as MoodboardHttpMethod }
export { AsyncOperationStatus as MoodboardOperationStatus }
export { BeatImageTriggerStatus as MoodboardTriggerStatus }

export enum MoodboardStorageKey {
  Provider = 'MOODBOARD_PROVIDER',
  PrimaryPrefix = 'moodboard-primary-',
  GenPrefix = 'moodboard-gen-',
}

export { BEAT_IMAGE_MODEL_STORAGE_KEY as MoodboardModelStorageKey }
export { BEAT_IMAGE_DEFAULT_MODEL_ID as MoodboardDefaultModelId }

export enum MoodboardOperationLabel {
  Generating = 'Generating Moodboard',
  Regenerating = 'Regenerating Image',
  GeneratingResumed = 'Generating Moodboard (resumed)',
  RegeneratingResumed = 'Regenerating Image (resumed)',
}

export enum MoodboardOperationDetail {
  Initializing = 'Initializing...',
  ProjectPrefix = 'Project: ',
}

export enum MoodboardGenerationError {
  TriggerFailed = 'Failed to trigger moodboard generation task',
  GenerationFailed = 'Moodboard generation failed',
}

export enum MoodboardUserToast {
  GenerationFailed = 'Moodboard generation failed',
}

export enum MoodboardGenerationLog {
  TaskTriggered = 'Moodboard generation task triggered:',
  GenerationError = 'Moodboard generation error:',
  RunNotFound = 'Moodboard generation run not found after grace period, clearing state',
  Completed = '✅ Moodboard generation completed:',
  Failed = '❌ Moodboard generation failed:',
  PollingError = 'Status polling error:',
  GeneratedSuccessfully = 'Moodboard generated successfully',
  CompletionError = 'Error handling moodboard completion:',
  ResumingPolling = 'Resuming moodboard generation polling for:',
  ParseStateFailed = 'Failed to parse moodboard generation run state:',
}

export enum MoodboardTriggerStage {
  WaitingDiffusion = 'waiting_diffusion',
}

export const moodboardPrimaryStorageKey = (projectId: string) =>
  `${MoodboardStorageKey.PrimaryPrefix}${projectId}`

export const moodboardGenOperationPrefix = (projectId: string) =>
  `${MoodboardStorageKey.GenPrefix}${projectId}`
