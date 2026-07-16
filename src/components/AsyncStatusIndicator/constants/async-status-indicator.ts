import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'
import { TriggerRunStatus } from '@/shared/data/constants/protocol'

export const AsyncStatusIndicatorLog = {
  FoundStuckOperations: '[AsyncStatusIndicator] Found',
  RemovingStaleStoryAgent: '[AsyncStatusIndicator] Removing stale story-agent operation',
  RemovingStaleWorldGen: '[AsyncStatusIndicator] Removing stale world-gen operation',
  ErrorCheckingOperation: '[AsyncStatusIndicator] Error checking operation',
  FailedParseMetadata: '[AsyncStatusIndicator] Failed to parse metadata for',
  CheckingRetexture: '[AsyncStatusIndicator] Checking retexture',
  TaskNotFound: '[AsyncStatusIndicator] Task',
  TaskStatus: '[AsyncStatusIndicator] Task',
  UpdatedCompleted: '[AsyncStatusIndicator] Updated',
  UpdatedFailed: '[AsyncStatusIndicator] Updated',
  NoMetadata3d: '[AsyncStatusIndicator] No metadata for 3D op',
  NoRunId3d: '[AsyncStatusIndicator] No runId for 3D op',
  Checking3d: '[AsyncStatusIndicator] Checking 3D operation',
  ThreeDNotFound: '[AsyncStatusIndicator] 3D task',
  ThreeDStatus: '[AsyncStatusIndicator] 3D task',
  ErrorChecking3d: '[AsyncStatusIndicator] Error checking 3D operation:',
  NoMetadataPortrait: '[AsyncStatusIndicator] No metadata for portrait op',
  CheckingPortrait: '[AsyncStatusIndicator] Checking portrait operation',
  PortraitNotFound: '[AsyncStatusIndicator] Portrait task',
  ErrorCheckingPortrait: '[AsyncStatusIndicator] Error checking portrait operation:',
} as const

export const ASYNC_STATUS_EMPTY_METADATA = '{}'

export enum AsyncStatusTaskError {
  TaskNotFound = 'Task not found',
}

export enum AsyncStatusIndicatorUiCopy {
  InProgress = 'In progress',
  Dismiss = 'Dismiss',
  ClearAllStale = 'Clear all stale operations',
  NoActiveOperations = 'No active operations',
}

export const ASYNC_STATUS_FAILURE_STATUS = TriggerRunStatus.NotFound

export const OPERATION_TYPE_COLORS: Record<OperationTypeId, string> = {
  [OperationTypeId.WorldGen]: 'text-yellow-500 bg-yellow-500',
  [OperationTypeId.ThreeDGen]: 'text-blue-500 bg-blue-500',
  [OperationTypeId.ThreeDRemesh]: 'text-cyan-500 bg-cyan-500',
  [OperationTypeId.StoryAgent]: 'text-purple-500 bg-purple-500',
  [OperationTypeId.PortraitGen]: 'text-pink-500 bg-pink-500',
  [OperationTypeId.Retexture]: 'text-violet-500 bg-violet-500',
}

export const DEFAULT_OPERATION_COLOR = 'text-gray-500 bg-gray-500'
