import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import { TriggerTerminalStatus } from '@/shared/jobs/constants/trigger-active-status'
import { TileProgressStage } from '../ui/constants/tile-stage-labels'
import { WorldGenReviewType } from '../state/constants/world-ui-store'

export enum HttpRequestHeader {
  ContentType = 'Content-Type',
}

export {
  ContentType,
  HttpMethod,
  UrlScheme,
  AsyncOperationStatus,
  OperationTypeId,
  TriggerTerminalStatus,
  TileProgressStage,
  WorldGenReviewType,
}

export enum FidelityApiRoute {
  Trigger = '/api/trigger-fidelity',
  Status = '/api/trigger-fidelity/status',
}

export enum FidelityOperationLabel {
  EnhancingFidelity = 'Enhancing Fidelity',
  EnhancingFidelityResumed = 'Enhancing Fidelity (resumed)',
}

export enum FidelityOperationDetailSuffix {
  ReviewEnhancement = ' - Review enhancement',
}

export enum FidelityServiceLog {
  StartingViaTrigger = 'Starting fidelity enhancement via Trigger.dev for tile',
  TriggeringTask = 'Triggering enhance-fidelity task',
  TaskTriggered = 'Fidelity enhancement task triggered:',
  EnhancementError = 'Fidelity enhancement error:',
  RunNotFoundAfterRetries = 'Fidelity run not found after retries, clearing state',
  EnhancementCompleted = 'Fidelity enhancement completed:',
  EnhancementFailed = 'Fidelity enhancement failed:',
  StatusPollingError = 'Status polling error:',
  CompletedWithSupabaseUrl = '[FidelityService] Enhancement completed with Supabase URL:',
  TileUpdatedWithEnhancedImage = 'Tile updated with enhanced image:',
  ErrorUpdatingTileAfterCompletion = 'Error updating tile after completion:',
  ResumingPolling = 'Resuming fidelity enhancement polling for:',
  FailedToParseRunState = 'Failed to parse fidelity run state:',
  StoppedForTile = 'Stopped fidelity enhancement for tile:',
}

export enum FidelityServiceError {
  TileHasNoImage = 'Tile has no image to enhance',
  FailedToTriggerTask = 'Failed to trigger fidelity enhancement task',
  EnhancementFailed = 'Enhancement failed',
  TaskNotFound = 'Enhancement task not found',
}

export enum DynamicLocalStoragePrefix {
  FidelityRun = 'fidelity-run-',
}

export enum FidelityOperationIdPrefix {
  Fidelity = 'fidelity-',
}
