/** 3D generation task wire values — URLs, headers, logs, and API fields. */

import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import {
  BufferEncoding,
  ContentType,
  FsDirectory,
  HttpAuthScheme,
  HttpMethod,
  Hyper3dTaskStatus,
  ImageFileExtension,
  ImageMimeType,
  JsonImageUrlType,
  UrlScheme,
} from '@/shared/data/constants/protocol'
import { Hyper3dResponseField, MeshyAiModelId, MeshyResponseField } from '@/shared/ai/constants/meshy'

export { DB_COLUMN, DB_TABLE }
import { MeshyTaskStatusValue } from './meshy-task-types'

export {
  BufferEncoding,
  ContentType,
  HttpAuthScheme,
  HttpMethod,
  Hyper3dTaskStatus,
  ImageFileExtension,
  ImageMimeType,
  JsonImageUrlType,
  MeshyAiModelId,
  MeshyResponseField,
  Hyper3dResponseField,
  MeshyTaskStatusValue,
  UrlScheme,
}

export enum MeshyGenerationApiUrl {
  OpenApiImageTo3d = 'https://api.meshy.ai/openapi/v1/image-to-3d',
}

export enum MeshyGenerationApiPath {
  Stream = 'stream',
}

export function meshyImageTo3dTaskUrl(taskId: string): string {
  return `${MeshyGenerationApiUrl.OpenApiImageTo3d}/${taskId}`
}

export function meshyImageTo3dStreamUrl(taskId: string): string {
  return `${meshyImageTo3dTaskUrl(taskId)}/${MeshyGenerationApiPath.Stream}`
}

export enum Hyper3dGenerationApiUrl {
  Rodin = 'https://api.hyper3d.ai/v1/rodin',
  RodinStatus = 'https://api.hyper3d.ai/v1/rodin/status',
}

export enum MeshyGenerationRequestField {
  ImageUrl = 'image_url',
  AiModel = 'ai_model',
  EnablePbr = 'enable_pbr',
  Topology = 'topology',
  TargetPolycount = 'target_polycount',
  ShouldRemesh = 'should_remesh',
}

export enum MeshyGenerationHttpHeader {
  Authorization = 'Authorization',
  ContentType = 'Content-Type',
}

export const MESHY_GENERATION_DB_COLUMN_MODEL_FILENAME = 'model_filename' as const
export const MESHY_GENERATION_DB_COLUMN_IMAGE_FILENAME = 'image_filename' as const

export enum MeshyGenerationMetadataKey {
  Progress = 'progress',
  MeshyTaskId = 'meshy_task_id',
}

export enum MeshyGenerationLog {
  StartingMeshy = 'Starting Meshy API call',
  MeshyApiError = 'Meshy API error:',
  StatusCheckFailed = 'Status check failed:',
  MeshySucceeded = 'Meshy SUCCEEDED - returning result immediately',
  MeshyRetrieve = 'Meshy retrieve',
  MeshyProgress = 'Meshy progress',
  MeshyStreamFallback = 'Meshy stream unavailable; polling retrieve',
  DbUpdateFailed = 'DB update failed but Meshy succeeded',
  StartingHyper3d = 'Starting Hyper3D API call',
  Hyper3dSubscriptionKey = 'Hyper3D subscription key:',
  ModelGenerated = '3D model generated successfully',
  FailedDbUpdate = 'Failed to update asset in database',
}

export enum MeshyGenerationError {
  FailedCheckStatus = 'Failed to check task status',
  StreamUnavailable = 'Meshy progress stream is unavailable',
  StreamEnded = 'Meshy progress stream ended before the task finished',
  NoTaskId = 'Meshy API did not return a task id',
  FailedCheckHyper3d = 'Failed to check Hyper3D task status',
  NoSubscriptionKey = 'Hyper3D API did not return a subscription key',
  Hyper3dNoResult = 'Hyper3D generation completed without a result payload',
  Unknown = 'Unknown error',
}

export enum MeshyGenerationErrorField {
  Error = 'error',
}

export const MESHY_DEFAULT_POLYCOUNT = 30000
export const MESHY_POLL_INTERVAL_MS = 20_000
export const MESHY_MAX_POLL_ATTEMPTS = 90
export const HYPER3D_POLL_INTERVAL_MS = 5000
export const HYPER3D_MAX_POLL_ATTEMPTS = 180

export enum PrepareImagePathPrefix {
  Projects = '/projects/',
}

export const PrepareImagePublicDir = {
  Public: FsDirectory.Public,
} as const

export enum PrepareImageError {
  NotFoundPrefix = 'Image file not found:',
  NotPublic = 'Asset image is not a public URL; re-save the asset',
  BlobUploadFailed = 'Failed to upload asset image to Vercel Blob',
}

export enum PrepareImageDataUrlSeparator {
  MimeBase64 = ';base64,',
}
