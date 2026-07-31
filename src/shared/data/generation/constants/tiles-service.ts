/** Tiles / 3D / portrait generation service wire values. */

import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { JobType } from '@/shared/types/enums'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export const AiUpscaleProvider = {
  Midjourney: ImageGenProvider.Midjourney,
} as const

export type AiUpscaleProvider = (typeof AiUpscaleProvider)[keyof typeof AiUpscaleProvider]

export enum TriggerRunResultStatus {
  Triggered = 'triggered',
  Queued = 'queued',
}

export enum GenerationServiceErrorCode {
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  ValidationError = 'VALIDATION_ERROR',
  InternalError = 'INTERNAL_ERROR',
  RateLimited = 'RATE_LIMITED',
}

export enum GenerationServiceErrorName {
  ServiceError = 'ServiceError',
}

export enum GenerationServiceErrorMessage {
  FailedTriggerTileGeneration = 'Failed to trigger tile generation',
  FailedTriggerTileUpscale = 'Failed to trigger tile upscale',
  FailedRetrieveRunStatus = 'Failed to retrieve run status',
  FailedCancelRun = 'Failed to cancel run',
  FailedTrigger3dModelGeneration = 'Failed to trigger 3D model generation',
  FailedTrigger3dModelRemesh = 'Failed to trigger 3D model remesh',
  FailedTriggerPortraitGeneration = 'Failed to trigger portrait generation',
}

export enum GenerationServiceLog {
  TilesTriggerError = '[TilesService] Error triggering tile generation:',
  TilesUpscaleError = '[TilesService] Error triggering tile upscale:',
  TilesRunStatusError = '[TilesService] Error retrieving run status:',
  TilesCancelError = '[TilesService] Error canceling run:',
  ThreeDTriggerError = '[ThreeDService] Error triggering 3D model generation:',
  ThreeDRemeshError = '[ThreeDService] Error triggering 3D model remesh:',
  PortraitTriggerError = '[PortraitService] Error triggering portrait generation:',
}

export enum GenerationServiceUserMessage {
  TileGenerationStartedPrefix = 'Tile generation started at ',
  RunStatusHint = 'Use get_run_status to track progress.',
  TileUpscaleStarted = 'Tile upscale started. Use get_run_status to track progress.',
  ThreeDModelGenerationStarted = '3D model generation started. Use get_run_status to track progress.',
  ThreeDModelRemeshStarted = '3D model remesh started. Use get_run_status to track progress.',
  PortraitGenerationStarted = 'Portrait generation started. Use get_run_status to track progress.',
}

// Not an enum: members alias other string enums/consts, which TS forbids as
// computed enum values. A frozen const map gives the same value access.
export const GenerationTriggerTaskId = {
  GenerateTile: JobType.GenerateTile,
  UpscaleTile: JobType.UpscaleTile,
  Generate3dModel: TRIGGER_TASK_ID.GENERATE_3D_MODEL,
  Remesh3dModel: TRIGGER_TASK_ID.REMESH_3D_MODEL,
  GeneratePortrait: TRIGGER_TASK_ID.GENERATE_PORTRAIT,
} as const
