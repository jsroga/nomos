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
  GeneratingStoryboard = 'Generating Storyboard',
  GeneratingEpisodePoster = 'Generating Episode Poster',
  GeneratingEpisodePosterResumed = 'Generating Episode Poster (resumed)',
  GeneratingStoryboardResumed = 'Generating Storyboard (resumed)',
}

export enum PosterOperationDetail {
  CreatingVisualScript = 'Creating visual script...',
  CreatingCinematicPoster = 'Creating cinematic poster via Midjourney...',
  ResumingGeneration = 'Resuming generation...',
  StatusPrefix = 'Status: ',
}

export enum PosterGenerationError {
  StoryboardTriggerFailed = 'Failed to trigger storyboard generation task',
  PosterTriggerFailed = 'Failed to trigger poster generation task',
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

export enum PosterPersistLabel {
  Storyboard = 'Storyboard',
  Poster = 'Poster',
}

export enum PosterUnknownLabel {
  Unknown = 'unknown',
}
