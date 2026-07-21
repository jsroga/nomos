export type UpscaleProvider = 'midjourney' | 'replicate' | 'stability'

export interface ProviderConfig {
  apiKey: string
  model?: string
  upscaleMode?: 'conservative' | 'creative'
}
