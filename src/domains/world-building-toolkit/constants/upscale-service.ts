import { BooleanQueryValue, ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import { TriggerTerminalStatus } from '@/shared/jobs/constants/trigger-active-status'
import { TileProgressStage } from '../ui/constants/tile-stage-labels'
import { WorldGenReviewType } from '../state/constants/world-ui-store'

export enum HttpRequestHeader {
  ContentType = 'Content-Type',
}

export {
  BooleanQueryValue,
  ContentType,
  HttpMethod,
  UrlScheme,
  AsyncOperationStatus,
  OperationTypeId,
  TriggerTerminalStatus,
  TileProgressStage,
  WorldGenReviewType,
}

export enum UpscaleApiRoute {
  Trigger = '/api/trigger-upscale',
  Status = '/api/trigger-upscale/status',
  SelectVariant = '/api/trigger-upscale/select-variant',
}

export enum UpscaleOperationLabel {
  UpscalingTile = 'Upscaling Tile',
  UpscalingTileResumed = 'Upscaling Tile (resumed)',
  CroppingMjVariant = 'Cropping MJ Variant',
}

export enum UpscaleOperationDetailSuffix {
  ReviewUpscale = ' - Review upscale',
  SelectVariant = ' - Select variant',
}

export enum UpscaleServiceLog {
  StartingViaTrigger = 'Starting upscale via Trigger.dev for tile',
  Creativity = 'creativity',
  TriggeringTask = 'Triggering upscale-tile task with provider:',
  TaskTriggered = 'Upscale task triggered:',
  UpscaleError = 'Upscale error:',
  RunNotFoundAfterRetries = 'Upscale run not found after retries, clearing state',
  UpscaleCompleted = 'Upscale completed:',
  UpscaleFailed = 'Upscale failed:',
  StatusPollingError = 'Status polling error:',
  CompletedWithSupabaseUrls = '[UpscaleService] Upscale completed with Supabase URLs:',
  MjGridReceived = 'MJ grid received, storing for variant selection:',
  TileUpdatedWithUpscaledImage = 'Tile updated with upscaled image:',
  ErrorUpdatingTileAfterCompletion = 'Error updating tile after completion:',
  ResumingPolling = 'Resuming upscale polling for:',
  FailedToParseRunState = 'Failed to parse upscale run state:',
  StoppedForTile = 'Stopped upscale for tile:',
  CroppingVariant = 'Cropping variant',
  From = 'from:',
  VariantSelectionTriggered = 'Variant selection triggered:',
  VariantSelectionError = 'Variant selection error:',
}

export enum UpscaleServiceError {
  TileHasNoImage = 'Tile has no image to upscale',
  InvalidDataUrl = 'Invalid data URL',
  FailedToTriggerTask = 'Failed to trigger upscale task',
  UpscaleFailed = 'Upscale failed',
  TaskNotFound = 'Upscale task not found',
  NoMjGridData = 'No MJ grid data found for this tile',
  FailedToTriggerVariantSelection = 'Failed to trigger variant selection',
}

export enum DynamicLocalStoragePrefix {
  UpscaleRun = 'upscale-run-',
}

export enum UpscaleOperationIdPrefix {
  Upscale = 'upscale-',
  MjVariant = 'mj-variant-',
}
