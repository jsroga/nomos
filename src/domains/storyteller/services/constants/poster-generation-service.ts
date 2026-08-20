/** Poster / storyboard generation client service wire values. */

import { BeatImageTriggerStatus } from '@/domains/storyteller/services/constants/beat-image-service'
import {
  StorytellerHttpMethod,
  StorytellerPosterType,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'

export { BeatImageTriggerStatus as PosterTriggerStatus }
export { StorytellerHttpMethod as PosterHttpMethod }
export { StorytellerPosterType as PosterGenerationType }
export { AsyncOperationStatus as PosterOperationStatus }
export { OperationTypeId as PosterOperationTypeId }

export enum PosterStorageKeyPrefix {
  StoryboardGen = 'storyboard-gen-',
  PosterGen = 'poster-gen-',
}

export enum PosterOperationLabel {
  GeneratingStoryboard = 'Generating storyboard video',
  GeneratingEpisodePoster = 'Generating Episode Poster',
  GeneratingEpisodePosterResumed = 'Generating Episode Poster (resumed)',
  GeneratingStoryboardResumed = 'Generating storyboard video (resumed)',
}

export enum PosterOperationDetail {
  CreatingVisualScript = 'Composing beat sheet and generating video...',
  CreatingCinematicPoster = 'Creating cinematic poster...',
  ResumingGeneration = 'Resuming generation...',
  StatusPrefix = 'Status: ',
}

export enum PosterGenerationError {
  StoryboardTriggerFailed = 'Failed to trigger storyboard video generation',
  PosterTriggerFailed = 'Failed to trigger poster generation task',
  NoImageUrl = 'Generation completed but no image was returned',
  GenerationFailed = 'Image generation failed',
}

export enum PosterUserToast {
  PosterFailed = 'Poster generation failed',
  StoryboardFailed = 'Storyboard video generation failed',
}

export enum PosterGenerationLog {
  StoryboardStart = 'Starting storyboard generation for episode ',
  PosterStart = 'Starting poster generation for episode ',
  StoryboardError = 'Storyboard generation error:',
  PosterError = 'Poster generation error:',
  PollingStart = '📡 Starting status polling for run: ',
  RunNotFound = 'Poster generation run not found, clearing state',
  Completed = '✅ Poster generation completed:',
  NoImageUrl = 'Completed but no image URL found',
  Failed = '❌ Poster generation failed:',
  PollingError = 'Status polling error:',
  Persisting = 'Poster generated successfully, persisting to DB...',
  PersistedStoryboard = '✅ Storyboard URL persisted to DB',
  PersistedPoster = '✅ Poster URL persisted to DB',
  PersistFailed = '❌ Failed to persist ',
  RecoveredFromDb = 'Poster recovered from episode row after poll loss',
  ParkedForResume = 'Poster poll parked; Trigger job remains the DB writer',
  CompletionError = 'Error handling poster completion:',
  ResumingPolling = 'Resuming poster generation polling for:',
  ParseStateFailed = 'Failed to parse poster generation run state:',
}

export enum PosterGenerationEvent {
  Complete = 'poster-generation-complete',
}

export enum PosterPersistField {
  StoryboardUrl = 'storyboardUrl',
  PosterUrl = 'posterUrl',
  PosterPrompt = 'posterPrompt',
}

export enum PosterEpisodeUrlField {
  Camel = 'posterUrl',
  Snake = 'poster_url',
}

/** `Date.now()` millis embedded in poster / mood filenames (`poster_<id>_<ms>.png`). */
export const GENERATED_ASSET_TIMESTAMP_PATTERN = /_(\d{13})\.(?:png|jpe?g|webp)/i

export enum PosterRunStateField {
  BaselinePosterUrl = 'baselinePosterUrl',
}

export enum PosterPersistLabel {
  Storyboard = 'Storyboard',
  Poster = 'Poster',
}

export const POSTER_RUN_MAX_POLLS = 120
export const STORYBOARD_VIDEO_MAX_POLLS = 180

export enum PosterUnknownLabel {
  Unknown = 'unknown',
}
