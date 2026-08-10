import type { UpscaleProvider } from '../core/upscale-provider-wire'

export type { UpscaleProvider }

export interface ProviderConfig {
  apiKey: string
  model?: string
  upscaleMode?: 'conservative' | 'creative'
}
