import {
  ModelFileExtension,
  UrlSchemePrefix,
} from '@/domains/3d-canvas/constants/properties-panel'

export function isRetextureableModelUrl(modelUrl: string): boolean {
  if (!modelUrl) return false

  return (
    modelUrl.endsWith(ModelFileExtension.Glb) ||
    modelUrl.endsWith(ModelFileExtension.Gltf) ||
    modelUrl.startsWith(UrlSchemePrefix.Http)
  )
}
