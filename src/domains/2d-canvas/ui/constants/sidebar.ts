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
export const STYLE_REF_UNDO_TOAST_MS = 4000

export enum WorldGenSidebarWorldCopy {
  PromptLabel = 'MASTER PROMPT',
  Placeholder = 'Describe the look of your world…',
  ResetStyleAnchor = 'Reset style anchor',
  StyleImagesLabel = 'Style references',
  StyleImagesHintBefore = 'Up to 3 images, used as Midjourney ',
  StyleImagesHintAfter = '.',
  StyleImagesDrop = 'Drop images here',
  StyleImagesChoose = 'Choose images',
  StyleImagesClear = 'Clear all',
  StyleImagesRemove = 'Remove',
  StyleImagesFull = '3 of 3',
  StyleImagesUploading = 'UPLOADING',
  SrefCaption = 'SREF',
  SrefFlag = '--sref',
  SwitchModeTitle = 'Switch generation mode?',
  SwitchModeDescription =
    'Switching to {mode} replaces the master prompt and the Midjourney style images.',
  PromptGenerating = 'Prompt is generating — references stay editable.',
}

export const GENERATION_MODE_NAME_PLACEHOLDER = '{mode}'

export function switchGenerationModeDescription(modeName: string): string {
  return WorldGenSidebarWorldCopy.SwitchModeDescription.replace(
    GENERATION_MODE_NAME_PLACEHOLDER,
    modeName,
  )
}

export function styleRefCaption(index: number): string {
  return `${WorldGenSidebarWorldCopy.SrefCaption} ${index + 1}`
}

export function styleRefCountLabel(count: number, max: number): string {
  return `${count} / ${max}`
}

export function styleRefUploadingLabel(count: number): string {
  return `${WorldGenSidebarWorldCopy.StyleImagesUploading} ${count}`
}

export enum WorldGenStyleRefsClass {
  Header = 'mt-[22px] mb-2 flex items-center gap-2',
  Label = 'inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-foreground/80 whitespace-nowrap',
  Count = 'ml-auto font-mono text-[10.5px] text-muted-foreground/60 whitespace-nowrap',
  Uploading = 'ml-auto font-mono text-[10.5px] text-primary whitespace-nowrap',
  Hint = 'mb-2.5 text-[11.5px] leading-[1.6] text-muted-foreground/75 text-pretty',
  HintFlag = 'font-mono',
  Generating = 'mt-2.5 text-[11.5px] leading-[1.6] text-muted-foreground/75',
}

export enum WorldGenSidebarClass {
  Divider = 'h-px bg-border/55 mt-5 mb-4',
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
  ReferenceRemoved = 'Reference removed',
  Undo = 'Undo',
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
  WorldGen = 'INFINITE CANVAS',
}

export enum WorldGenDataUrlCheck {
  Comma = ',',
  ImagePrefix = 'data:image/',
}
