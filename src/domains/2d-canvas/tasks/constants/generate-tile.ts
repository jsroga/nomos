import { z } from 'zod'
import { ownedElsewhere } from '@/shared/jobs/payload-schema'
import { OWNED_PAYLOAD_SHAPE } from '@/shared/jobs/submission-nonce'
import type { TileContext } from '@/shared/ai/types'
import type { ContextImageVariant } from '@/shared/ai/contextAssembler'
import type { PackedCropRect, PackedCropSpec } from '@/shared/ai/context-pack-layout'
import { GoogleModelId } from '@/shared/data/constants/protocol'
import { GeminiFinishReason } from '@/shared/data/constants/repaint-gemini'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { LegNextJobStatus, LegNextModelId } from '@/shared/ai/constants/legnext'
import type { NeighborImageUrls } from '../../core/neighbor-image-urls'

export type TileNeighborsPayload = TileContext['neighbors']

export const generateTileContextPayloadSchema = z.object({
  images: ownedElsewhere<Partial<Record<ContextImageVariant, string>>>(),
  preferredVariant: z.string().optional(),
  cropRect: ownedElsewhere<PackedCropRect>().optional(),
  packedWidth: z.number().optional(),
  packedHeight: z.number().optional(),
})

export type GenerateTileContextPayload = z.infer<typeof generateTileContextPayloadSchema>

export const generateTilePayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
  x: z.number(),
  y: z.number(),
  prompt: z.string(),
  aiProvider: z.string(),
  aiConfig: z.record(z.string(), z.unknown()),
  isFirstTile: z.boolean().optional(),
  styleReferenceUrls: z.array(z.string()).optional(),
  styleContext: z.string().optional(),
  masterPrompt: z.string().optional(),
  modePromptFragment: z.string().optional(),
  modeNegatives: z.array(z.string()).optional(),
  styleAnchorUrl: z.string().optional(),
  contextImageBase64: z.string().optional(),
  contextPayload: generateTileContextPayloadSchema.optional(),
  neighbors: ownedElsewhere<TileNeighborsPayload>().optional(),
  neighborImageUrls: ownedElsewhere<NeighborImageUrls>().optional(),
  packedCrop: ownedElsewhere<PackedCropSpec>().optional(),
})

export type GenerateTilePayload = z.infer<typeof generateTilePayloadSchema>

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
/** Follow-up seam color-fade width in px. Packed-crop path blends against neighbor edges. */
export const FOLLOW_UP_SEAM_BLEND_PX = 16

export function packedCropFromContext(
  payload: GenerateTileContextPayload | undefined,
): PackedCropSpec | undefined {
  if (!payload?.cropRect) return undefined
  const packedWidth = payload.packedWidth
  const packedHeight = payload.packedHeight
  if (!packedWidth || !packedHeight) return undefined
  return {
    cropRect: payload.cropRect,
    packedWidth,
    packedHeight,
  }
}
