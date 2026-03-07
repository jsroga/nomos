import type { Tile } from '@/domains/world-building-toolkit/store/useWorldStore'

export interface TileContext {
  targetX: number
  targetY: number
  neighbors: {
    up?: Tile & { imageUrl?: string }
    down?: Tile & { imageUrl?: string }
    left?: Tile & { imageUrl?: string }
    right?: Tile & { imageUrl?: string }
    topLeft?: Tile & { imageUrl?: string }
    topRight?: Tile & { imageUrl?: string }
    bottomLeft?: Tile & { imageUrl?: string }
    bottomRight?: Tile & { imageUrl?: string }
  }
  styleReferenceUrls?: string[]
  // We might need the full tiles map for more complex context later
  allTiles: Record<string, Tile>
}

export interface AIModelConfig {
  apiKey?: string
  baseUrl?: string // For Custom provider
  modelId?: string // e.g. "dall-e-2", "stable-diffusion-xl-1024-v1-0"
  params?: {
    steps?: number
    cfgScale?: number
    sampler?: string
    [key: string]: unknown
  }
}

export interface AIModel {
  id: string
  name: string
  description: string

  // Returns the generated image URL (base64 or remote URL)
  generate(prompt: string, context: TileContext, config: AIModelConfig): Promise<string>

  // Returns true if the model is configured correctly (e.g. has API key)
  validateConfig(config: AIModelConfig): boolean
}
