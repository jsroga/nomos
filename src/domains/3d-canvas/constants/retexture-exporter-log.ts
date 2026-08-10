export enum RetextureExporterLog {
  StartingExport = '📦 Starting Retexture Export for:',
  OriginalTransform = '📏 Original Transform:',
  BoundingBox = '📐 Bounding Box:',
  UpdateBoundingBoxFailed = 'Failed to update operation with bounding box:',
  GltfJsonSize = '💾 GLTF JSON Size:',
  Base64Ready = '✅ Base64 Data Ready (prefix):',
  ExportError = '❌ An error happened during retexture export:',
  ObjectNotFound = '❌ Object not found for retexture export:',
}

export enum RetextureExporterMimeType {
  GltfJson = 'model/gltf+json',
}
