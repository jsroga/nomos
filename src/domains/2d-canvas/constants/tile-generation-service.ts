import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { AsyncOperationStatus } from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import { TriggerTerminalStatus } from '@/shared/jobs/constants/trigger-active-status'
import { TileProgressStage } from '../ui/constants/tile-stage-labels'
import { VariantSelectionAction } from '../ui/constants/tile-review-dialog'
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
  VariantSelectionAction,
}

export enum TileGenerationApiRoute {
  Trigger = '/api/trigger-tile',
  Status = '/api/trigger-tile/status',
  CompleteToken = '/api/complete-token',
}

export enum TileGenerationOperationLabel {
  GeneratingTile = 'Generating Tile',
  GeneratingTileResumed = 'Generating Tile (resumed)',
}

export enum TileGenerationOperationDetailSuffix {
  ReviewGeneration = ' - Review generation',
}

export enum TileGenerationServiceLog {
  StartingViaTrigger = 'Starting tile generation via Trigger.dev for',
  UsingPreAssembledContext = 'Using pre-assembled context images',
  TriggeringTask = 'Triggering generate-tile task: isFirstTile=',
  HasContext = ', hasContext=',
  TaskTriggered = 'Tile generation task triggered:',
  GenerationError = 'Tile generation error:',
  RunNotFoundAfterRetries = 'Tile generation run not found after retries, clearing state',
  GenerationCompleted = 'Tile generation completed:',
  GenerationFailed = 'Tile generation failed:',
  StatusPollingError = 'Status polling error:',
  CompletedWithSupabaseUrl = '[TileGenerationService] Generation completed with Supabase URL:',
  TileGenerated = 'Tile generated:',
  ErrorUpdatingTileAfterCompletion = 'Error updating tile after completion:',
  ResumingPolling = 'Resuming tile generation polling for:',
  FailedToParseRunState = 'Failed to parse tile generation run state:',
  StoppedFor = 'Stopped tile generation for:',
}

export enum TileGenerationServiceError {
  FollowUpRequiresContext = 'Follow-up tile generation requires a client-assembled context image',
  FailedToTriggerTask = 'Failed to trigger tile generation task',
  GenerationFailed = 'Generation failed',
  TaskNotFound = 'Generation task not found',
  FailedToCompleteVariantSelection = 'Failed to complete variant selection',
}

export enum ContextAssemblyVariant {
  CanonicalFullContext = 'canonicalFullContext',
  SmartSeamContext = 'smartSeamContext',
}

export enum DynamicLocalStoragePrefix {
  TileGen = 'tile-gen-',
}

export enum TileGenerationOperationIdPrefix {
  Gen = 'gen-',
}

export enum TileIdPrefix {
  Tile = 'tile-',
}
