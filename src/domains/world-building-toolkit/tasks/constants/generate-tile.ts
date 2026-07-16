import type { TileContext } from '@/shared/ai/types'
import type { ContextImageVariant } from '@/shared/ai/contextAssembler'

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

export enum GenerateTileProvider {
  Gemini = 'gemini',
  NanoBanana = 'nano-banana',
  OpenAi = 'openai',
  Stability = 'stability',
  Midjourney = 'midjourney',
  LegnextUploadPaint = 'legnext-upload-paint',
}

export enum GeminiFinishReason {
  Safety = 'SAFETY',
}

export enum LegNextJobStatus {
  Completed = 'completed',
  Processing = 'processing',
  Pending = 'pending',
  Failed = 'failed',
}

export enum VariantSelectionAction {
  Accept = 'accept',
  Upscale = 'upscale',
}

export const GEMINI_DEFAULT_MODEL = 'gemini-3-pro-image-preview'
export const OPENAI_DEFAULT_MODEL = 'dall-e-3'
export const OPENAI_EDIT_MODEL = 'dall-e-2'
export const STABILITY_DEFAULT_MODEL = 'stable-diffusion-xl-1024-v1-0'
export const CONTEXT_CANONICAL_VARIANT = 'canonicalFullContext'
export const TILE_CROP_SIZE = 512
export const CONTEXT_CANVAS_SIZE = 1024
export const CENTER_CROP_OFFSET = 256
