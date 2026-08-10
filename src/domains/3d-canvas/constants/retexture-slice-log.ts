export const RETEXTURE_EMPTY_METADATA = '{}'

export enum RetextureOriginalType {
  Wall = 'wall',
  Surface = 'surface',
}

export enum RetextureSliceLog {
  UsingBoundingBox = '[previewRetexture] Using original bounding box:',
  FallbackSurfacePoints = 'No bounding box in metadata, fallback to surface points',
  FallingBackToSurfacePoints = '[previewRetexture] Falling back to surface point calculation',
  CreatingPreviewObject = '[previewRetexture] Creating preview object:',
  RevertFailed = 'Failed to revert',
}
