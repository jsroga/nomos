export enum CanvasContextId {
  TwoD = '2d',
}

export enum ImageCrossOrigin {
  Anonymous = 'Anonymous',
}

export enum CanvasCompositeOperation {
  DestinationOut = 'destination-out',
  SourceOver = 'source-over',
}

export enum AssetUploadResponseField {
  ImageFilename = 'imageFilename',
}

export const ASSET_EDITOR_CACHE_BUSTER_PARAM = 't='
export const ASSET_EDITOR_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const
export const ASSET_EDITOR_UPLOAD_UPDATE_EXISTING_VALUE = 'true'
export const ASSET_EDITOR_ERASER_CURSOR_STROKE_OUTER = 'rgba(255, 255, 255, 0.9)'
export const ASSET_EDITOR_ERASER_CURSOR_STROKE_INNER = 'rgba(0, 0, 0, 0.6)'
export const ASSET_EDITOR_INPAINT_STROKE_FILL = 'rgba(255, 0, 255, 0.5)'
export const ASSET_EDITOR_SAVE_IMAGE_FORMAT = 'image/png'
export const ASSET_EDITOR_ASSETS_PATH_PREFIX = 'assets/'

export const ASSET_EDITOR_NO_PROJECT_ERROR = 'No project selected'
export const ASSET_EDITOR_INVALID_IMAGE_TYPE_ERROR =
  'Please upload a valid image file (PNG, JPG, or WebP)'
export const ASSET_EDITOR_UPLOAD_SUCCESS = '2D image uploaded successfully!'
export const ASSET_EDITOR_UPLOAD_ERROR_LOG = 'Upload error:'
export const ASSET_EDITOR_INPAINT_NOT_IMPLEMENTED =
  'Inpainting on single assets not fully implemented yet. Use Eraser.'
export const ASSET_EDITOR_SAVE_SUCCESS = 'Asset saved!'
export const ASSET_EDITOR_SAVE_FAILED = 'Failed to save asset'

export const ASSET_EDITOR_CHECKERBOARD_BACKGROUND_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
} as const
