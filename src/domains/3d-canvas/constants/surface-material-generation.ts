export enum MaterialGenerationMode {
  TwoD = '2d',
  ThreeD = '3d',
}

export enum MaterialGenerationStage {
  Starting = 'starting',
  Processing = 'processing',
  Preview = 'preview',
  Refine = 'refine',
  Saving = 'saving',
  Completed = 'completed',
}

export enum MaterialGenerationOperationType {
  MaterialGen = 'material-gen',
}

export enum SurfaceRetextureOriginalType {
  Surface = 'surface',
}

export enum SurfacePropertiesLog {
  PollError = 'Poll error:',
  MeshyApiKeyReadFailed = 'Failed to read Meshy API key',
}

export enum SurfacePropertiesToast {
  StabilityApiKeyRequired = 'Stability API Key required for 2D textures. Go to Settings.',
  GenerationInProgress = '3D generation already in progress',
  MeshyApiKeyRequired = 'Please set Meshy API Key in Settings',
  GenerationStarted = '3D generation started! This may take a few minutes.',
  GenerationStartFailed = 'Failed to start 3D generation: ',
  MaterialApplied = '3D material applied!',
  GenerationCancelled = 'Generation cancelled',
}

export enum SurfacePropertiesError {
  GenerationFailed = 'Generation failed',
}

export enum SurfacePropertiesStageLabel {
  Complete = 'Complete!',
}

export const SURFACE_MATERIAL_OPERATION_ID_PREFIX = 'material-'

export enum MaterialOperationMetaKey {
  TaskId = 'taskId',
  ModelUrl = 'modelUrl',
  ThumbnailUrl = 'thumbnailUrl',
  Progress = 'progress',
  Stage = 'stage',
  Error = 'error',
  Prompt = 'prompt',
  SurfaceId = 'surfaceId',
  SurfaceBounds = 'surfaceBounds',
}

export enum SurfaceBoundsMetaKey {
  CenterX = 'centerX',
  CenterZ = 'centerZ',
  Width = 'width',
  Depth = 'depth',
}

export enum MeshyStoredConfigKey {
  ApiKey = 'apiKey',
}
