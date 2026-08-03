import { useInteriorStore } from '@/domains/3d-canvas'
import { RetextureMetadataOriginalType } from '@/domains/3d-canvas/constants/properties-panel'

export function buildRetextureStartMetadata(
  objectId: string,
  modelUrl: string,
  runId: string
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    taskId: runId,
    originalModelUrl: modelUrl,
  }

  const wallData = useInteriorStore.getState().walls.find(w => w.id === objectId)
  if (wallData) {
    metadata.originalType = RetextureMetadataOriginalType.Wall
    metadata.originalData = wallData
    return metadata
  }

  const surfaceData = useInteriorStore.getState().surfaces.find(s => s.id === objectId)
  if (surfaceData) {
    metadata.originalType = RetextureMetadataOriginalType.Surface
    metadata.originalData = surfaceData
    return metadata
  }

  metadata.originalType = RetextureMetadataOriginalType.Object
  return metadata
}
