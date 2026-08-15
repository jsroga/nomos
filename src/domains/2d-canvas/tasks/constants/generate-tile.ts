import type { TileContext } from '@/shared/ai/types'
import type { ContextImageVariant } from '@/shared/ai/contextAssembler'
import { GoogleModelId } from '@/shared/data/constants/protocol'
import { GeminiFinishReason } from '@/shared/data/constants/repaint-gemini'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { LegNextJobStatus, LegNextModelId } from '@/shared/ai/constants/legnext'

export type TileNeighborsPayload = TileContext['neighbors']

export interface GenerateTileContextPayload {
  images: Partial<Record<ContextImageVariant, string>>
  preferredVariant?: string
}

export interface GenerateTilePayload {
  projectId: string
  x: number
  y: number
  prompt: string
  aiProvider: string
  aiConfig: Record<string, unknown>
  isFirstTile?: boolean
  styleReferenceUrls?: string[]
  styleContext?: string
  masterPrompt?: string
  modePromptFragment?: string
  contextImageBase64?: string
  contextPayload?: GenerateTileContextPayload
  neighbors?: TileNeighborsPayload
}

export interface GenerateTileResult {
  success: boolean
  filename: string
  newUrl: string
  originalUrl?: string
  isFirstTile: boolean
  pendingReview: boolean
}

/**
 * Tile-task provider wire. Values alias shared enums via const map
 * (TS forbids enum members referencing other enums).
 */
export const GenerateTileProvider = {
  Gemini: ImageGenProvider.Gemini,
  NanoBanana: ImageGenProvider.NanoBanana,
  OpenAi: ImageGenProvider.OpenAi,
  Stability: ImageGenProvider.Stability,
  Midjourney: ImageGenProvider.Midjourney,
  LegnextUploadPaint: LegNextModelId.UploadPaint,
  Grok: ImageGenProvider.Grok,
} as const

export type GenerateTileProvider =
  (typeof GenerateTileProvider)[keyof typeof GenerateTileProvider]

export { GeminiFinishReason }
export { LegNextJobStatus }

export enum VariantSelectionAction {
  Accept = 'accept',
  Upscale = 'upscale',
}

export const GEMINI_DEFAULT_MODEL = GoogleModelId.Gemini3ProImagePreview
export const OPENAI_DEFAULT_MODEL = 'dall-e-3'
export const OPENAI_EDIT_MODEL = 'dall-e-2'
export const STABILITY_DEFAULT_MODEL = 'stable-diffusion-xl-1024-v1-0'
export const CONTEXT_CANONICAL_VARIANT = 'canonicalFullContext'
export const TILE_CROP_SIZE = 512
export const CONTEXT_CANVAS_SIZE = 1024
export const CENTER_CROP_OFFSET = 256
