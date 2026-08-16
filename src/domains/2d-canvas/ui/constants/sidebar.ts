import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { CHAT_DEBUG_ADMIN_PIN } from '@/shared/chat/core/constants/chat-interface'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ContextAssemblyVariant } from '../../constants/tile-generation-service'

export { HttpMethod, UrlScheme, ContentType, CHAT_DEBUG_ADMIN_PIN, ContextAssemblyVariant }

export enum WorldGenDefaultFidelityPrompt {
  Default =
    'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.',
}

export const MASTER_PROMPT_SAVE_DEBOUNCE_MS = 500

export enum WorldGenSidebarWorldCopy {
  Title = 'World',
  PromptLabel = 'Master prompt',
  Placeholder = 'World context for every generated tile...',
  ResetStyleAnchor = 'Reset style anchor',
  StyleImagesLabel = 'Midjourney style images',
  StyleImagesHint = 'Up to 3 images. Midjourney --sref only. Drag and drop or choose files.',
  StyleImagesDrop = 'Drop images here',
  StyleImagesChoose = 'Choose images',
  StyleImagesClear = 'Clear all',
  StyleImagesRemove = 'Remove',
  StyleImagesFull = '3 of 3',
  SwitchModeTitle = 'Switch generation mode?',
  SwitchModeDescription =
    'Switching to {mode} replaces the master prompt and the Midjourney style images.',
}

export const GENERATION_MODE_NAME_PLACEHOLDER = '{mode}'

export function switchGenerationModeDescription(modeName: string): string {
  return WorldGenSidebarWorldCopy.SwitchModeDescription.replace(
    GENERATION_MODE_NAME_PLACEHOLDER,
    modeName,
  )
}

export enum WorldGenSidebarLog {
  MjGridReady = 'MJ grid ready:',
  FailedToLoadProjectStyleRefs = 'Failed to load project style refs:',
  FailedToSaveWorldSettings = 'Failed to save world settings:',
  FailedToUploadStyleRefs = 'Failed to upload style refs:',
  BlobToDataUrlInvalidBlob = '[Sidebar] blobToDataUrl received invalid blob:',
  ConvertingBlobToDataUrl = '[Sidebar] Converting blob to data URL:',
  DataUrlCreated = '[Sidebar] Data URL created:',
  FileReaderError = '[Sidebar] FileReader error:',
  FailedToLoadNeighborImage = 'Failed to load neighbor image:',
  WorldSummary = 'World Summary:',
  FailedToFetchWorldSummary = 'Failed to fetch world summary:',
}

export enum WorldGenSidebarError {
  InvalidDataUrl = 'Invalid data URL',
  FileReaderError = 'FileReader error',
  InvalidBlob = 'Invalid blob',
  FailedToFetchSummary = 'Failed to fetch summary',
  FailedToLoadNeighborContext = 'Failed to load direct neighbor context for follow-up tile generation',
  UploadFailed = 'Upload failed',
}

export enum WorldGenSidebarToast {
  MasterPromptUpdated = 'Master Prompt updated from Storyteller Bible',
  FailedToFetchWorldInfo = 'Failed to fetch world info',
  Upscaling = 'Upscaling...',
  UpscaleQueued = 'Tile queued for upscaling!',
  UpscaleFailed = 'Upscale failed',
  EnhancingFidelity = 'Enhancing fidelity...',
  FidelityQueued = 'Tile queued for fidelity enhancement!',
  DeleteTileFailed = 'Failed to delete tile',
  StyleRefUploadFailed = 'Failed to upload style image',
  StyleRefsCleared = 'Style images cleared',
}

export const WorldGenTileProvider = {
  NanoBanana: ImageGenProvider.NanoBanana,
} as const

export type WorldGenTileProvider =
  (typeof WorldGenTileProvider)[keyof typeof WorldGenTileProvider]

export enum WorldGenSidebarApiRoute {
  UploadTile = '/api/upload-tile',
}

export enum WorldGenSidebarStorageKey {
  WorldGen = 'world-gen',
}

export enum WorldGenSidebarHeader {
  WorldGen = 'Infinite Canvas',
}

export enum WorldGenDataUrlCheck {
  Comma = ',',
  ImagePrefix = 'data:image/',
}
