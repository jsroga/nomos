import { ContentType, HttpMethod, UrlScheme } from '@/shared/data/constants/protocol'
import { CHAT_DEBUG_ADMIN_PIN } from '@/shared/chat/ui/constants/chat-interface'
import { ContextAssemblyVariant } from '../../constants/tile-generation-service'

export { HttpMethod, UrlScheme, ContentType, CHAT_DEBUG_ADMIN_PIN, ContextAssemblyVariant }

export enum WorldGenStylePresetFallback {
  Custom = 'custom',
}

export enum WorldGenStyleUrlStoragePrefix {
  Index = 'worldgen-style-url-idx-',
}

export enum WorldGenDefaultFidelityPrompt {
  Default =
    'Enhance with fine artistic details, crisp textures, and vibrant colors while maintaining the original composition.',
}

export enum WorldGenSidebarLog {
  MjGridReady = 'MJ grid ready:',
  FailedToLoadProjectStyleRefs = 'Failed to load project style refs:',
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
}

export enum WorldGenTileProvider {
  NanoBanana = 'nano-banana',
}

export enum WorldGenSidebarApiRoute {
  UploadTile = '/api/upload-tile',
}

export enum WorldGenSidebarStorageKey {
  WorldGen = 'world-gen',
}

export enum WorldGenSidebarHeader {
  WorldGen = 'World Gen',
}

export enum WorldGenDataUrlCheck {
  Comma = ',',
  ImagePrefix = 'data:image/',
}
