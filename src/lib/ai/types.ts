import { Tile } from '@/store/useWorldStore'

export interface TileContext {
  targetX: number
  targetY: number
  neighbors: {
    up?: Tile
    down?: Tile
    left?: Tile
    right?: Tile
  }
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
    [key: string]: any
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
