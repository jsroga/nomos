import { readString } from '@/shared/data/json-guards'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export const UpscaleProvider = {
  Midjourney: ImageGenProvider.Midjourney,
  Replicate: ImageGenProvider.Replicate,
  Stability: ImageGenProvider.Stability,
} as const

export type UpscaleProvider = (typeof UpscaleProvider)[keyof typeof UpscaleProvider]

const UPSCALE_PROVIDER_VALUES = new Set<string>(Object.values(UpscaleProvider))

export function parseUpscaleProvider(value: unknown): UpscaleProvider {
  const raw = readString(value)
  if (raw && UPSCALE_PROVIDER_VALUES.has(raw)) {
    for (const entry of Object.values(UpscaleProvider)) {
      if (entry === raw) return entry
    }
  }
  return UpscaleProvider.Stability
}
