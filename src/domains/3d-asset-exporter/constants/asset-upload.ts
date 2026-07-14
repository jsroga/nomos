import { FormField, HttpMethod, ModelFileExtension } from '@/shared/data/constants/protocol'

export enum AssetUploadStatus {
  Pending = 'pending',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error',
}

export enum AssetUploadXhrEvent {
  Progress = 'progress',
  Load = 'load',
  Error = 'error',
}

export enum AssetImageExtension {
  Png = '.png',
  Jpg = '.jpg',
  Jpeg = '.jpeg',
  Webp = '.webp',
}

export const ASSET_UPLOAD_ENDPOINT = '/api/assets/upload'
export const ASSET_UPLOAD_FILE_SIZE_ERROR = 'File exceeds 50MB limit'
export const ASSET_UPLOAD_NETWORK_ERROR = 'Network error'

export const ASSET_UPLOAD_FORM_FIELD_FILE = FormField.File
export const ASSET_UPLOAD_FORM_FIELD_PROJECT_ID = FormField.ProjectId
export const ASSET_UPLOAD_HTTP_METHOD = HttpMethod.Post

export const ASSET_SUPPORTED_IMAGE_EXTENSIONS = [
  AssetImageExtension.Png,
  AssetImageExtension.Jpg,
  AssetImageExtension.Jpeg,
  AssetImageExtension.Webp,
] as const

export const ASSET_SUPPORTED_MODEL_EXTENSIONS = [
  ModelFileExtension.Glb,
  ModelFileExtension.Gltf,
  ModelFileExtension.Fbx,
  ModelFileExtension.Obj,
  ModelFileExtension.Usdz,
] as const

export const ASSET_SUPPORTED_FORMATS = {
  images: [...ASSET_SUPPORTED_IMAGE_EXTENSIONS],
  models: [...ASSET_SUPPORTED_MODEL_EXTENSIONS],
} as const
