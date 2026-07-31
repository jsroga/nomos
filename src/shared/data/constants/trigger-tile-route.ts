/** Tile generation trigger route provider and model wire values. */

import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { LegNextModelId } from '@/shared/ai/constants/legnext'

export const TileTriggerProvider = {
  Midjourney: ImageGenProvider.Midjourney,
  Gemini: ImageGenProvider.Gemini,
  LegnextUploadPaint: LegNextModelId.UploadPaint,
  NanoBanana: ImageGenProvider.NanoBanana,
  Grok: ImageGenProvider.Grok,
} as const

export type TileTriggerProvider =
  (typeof TileTriggerProvider)[keyof typeof TileTriggerProvider]
