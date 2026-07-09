import { readString } from '@/shared/data/json-guards'

export enum UpscaleProvider {
  Midjourney = 'midjourney',
  Replicate = 'replicate',
  Stability = 'stability',
}

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
