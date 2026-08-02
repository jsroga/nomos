import { InteriorObjectModel } from '@/domains/interior-designer/constants/interaction-modes'
import {
  DATA_URL_PREFIX,
  HTTP_URL_PREFIX,
} from '@/domains/interior-designer/constants/three-js'
import { UrlScheme } from '@/shared/data/constants/protocol'

export enum UnityExportFolder {
  Assets = 'Assets',
  InteriorDesign = 'InteriorDesign',
  Models = 'Models',
  Textures = 'Textures',
}

export enum UnityExportFile {
  InteriorScene = 'InteriorScene.unity',
  Readme = 'README.txt',
}

export enum UnityModelFilePrefix {
  Model = 'model',
}

export enum UnityAssetExtension {
  Glb = 'glb',
  Gltf = 'gltf',
  Png = 'png',
  Jpg = 'jpg',
}

export enum ThreeEulerOrder {
  Xyz = 'XYZ',
}

export enum JsZipOutputType {
  Blob = 'blob',
}

export const UNITY_PRIMITIVE_MODEL_URLS = [
  InteriorObjectModel.Cube,
  InteriorObjectModel.Sphere,
  InteriorObjectModel.Cylinder,
] as const

export const UNITY_REMOTE_URL_SCHEMES = [HTTP_URL_PREFIX, UrlScheme.Https] as const
export const UNITY_DATA_URL_PREFIX = DATA_URL_PREFIX
export const UNITY_DEFAULT_MODEL_EXTENSION = UnityAssetExtension.Glb

export function isUnityPrimitiveModelUrl(url: string): boolean {
  return UNITY_PRIMITIVE_MODEL_URLS.some(primitiveUrl => primitiveUrl === url)
}

export const UNITY_EXPORT_README = `
3D Canvas Project Export
--------------------------------
1. Drag the 'Assets' folder from this Zip into your Unity Project root.
2. Open 'Assets/InteriorDesign/InteriorScene.unity'.
3. All models and walls should be placed correctly.
`.trim()
