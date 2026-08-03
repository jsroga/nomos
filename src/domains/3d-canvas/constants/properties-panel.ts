export enum InteriorElementPropertyKey {
  Thickness = 'thickness',
  Points = 'points',
  ModelUrl = 'modelUrl',
}

export enum RetextureMetadataOriginalType {
  Wall = 'wall',
  Surface = 'surface',
  Object = 'object',
}

export enum InteriorAsyncOperationType {
  Retexture = 'retexture',
  TextTo3D = 'text-to-3d',
}

export enum ModelFileExtension {
  Glb = '.glb',
  Gltf = '.gltf',
}

export enum UrlSchemePrefix {
  Http = 'http',
}

export enum PropertiesPanelLog {
  RetextureMetadataParseFailed = '[Retexture] Failed to parse operation metadata for cleanup',
  RetextureCleanupError = '[Retexture] Cleanup check error',
  RetextureMeshyKeyReadFailed = '[RetextureControls] Failed to read Meshy API key from localStorage:',
  PollError = 'Poll error',
  TextTo3DMetadataParseFailed = '[TextTo3D] Failed to parse operation metadata for cleanup',
  TextTo3DCleanupError = '[TextTo3D] Cleanup check error',
  TextTo3DPollSkipped = '[TextTo3D] Skipping poll - operation is in terminal state or missing',
  TextTo3DTaskFailed = 'Text-to-3D task failed or was terminated:',
  OperationMetadataParseFailed = 'Failed to parse operation metadata',
  ApplyModelFailed = 'Failed to apply model',
  MeshyKeyReadFailed = 'Failed to read Meshy API key from settings',
}

export enum PropertiesPanelToast {
  RetextureStartFailed = 'Failed to start retexture',
  JobInProgress = 'Job already in progress',
  TextTo3DStartFailed = 'Failed to start text-to-3d: ',
  TextTo3DJobInProgress = 'Text-to-3D job already in progress for this element',
  TextTo3DStarted = '3D generation started!',
  ModelApplied = '3D model applied!',
}

export enum PropertiesPanelLabel {
  RetexturingElement = 'Retexturing Element',
}

export enum PropertiesPanelStatusLabel {
  StartingJob = 'Starting Job...',
  GeneratingTexture = 'Generating Texture...',
  Generating3DModel = 'Generating 3D Model...',
}

export enum PropertiesPanelError {
  TaskNotFound = 'Task not found',
  OutputMissingUrl = 'Output missing URL',
}

export const RETEXTURE_OPERATION_ID_PREFIX = 'retexture-'
export const TEXT_TO_3D_OPERATION_ID_PREFIX = 'text-to-3d-'
