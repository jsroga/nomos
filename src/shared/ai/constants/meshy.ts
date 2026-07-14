/** Meshy API client wire values — URLs, statuses, logs, and errors. */

export enum MeshyLogLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export enum MeshyLogEmoji {
  Success = '✅',
  Warning = '⚠️',
  Error = '❌',
}

export enum MeshyLogPrefix {
  Client = '[MeshyClient]',
}

export enum MeshyApiBaseUrl {
  V2 = 'https://api.meshy.ai/v2',
  RetextureV1 = 'https://api.meshy.ai/openapi/v1/retexture',
}

export enum MeshyApiPath {
  ImageTo3d = '/image-to-3d',
}

export enum MeshyAiModelId {
  Latest = 'latest',
  Meshy4 = 'meshy-4',
  Meshy5 = 'meshy-5',
}

export enum MeshyLogMessage {
  ImageTo3dTaskCreated = 'Image-to-3D task created',
  UsingStyleReferenceImage = 'Using style reference image',
  RetextureRequest = 'Retexture request',
  RetextureApiError = 'Retexture API error',
  RetextureTaskCreated = 'Retexture task created',
}

export enum MeshyErrorMessage {
  TaskTimedOut = 'Meshy Task Timed Out',
  RetextureTaskTimedOut = 'Meshy Retexture Task Timed Out',
}

export enum MeshyModelFormat {
  Glb = 'glb',
}

export enum MeshyResponseField {
  ModelUrls = 'model_urls',
  ModelUrl = 'model_url',
  Status = 'status',
  Result = 'result',
  Output = 'output',
}
