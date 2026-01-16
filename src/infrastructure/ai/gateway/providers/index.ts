/**
 * AI Gateway Providers - Public Export
 */

export { BaseProviderAdapter } from './base-adapter'
export { StabilityAdapter, stabilityAdapter } from './stability-adapter'
export { MeshyAdapter, meshyAdapter } from './meshy-adapter'
export { FalAdapter, falAdapter } from './fal-adapter'
export { OpenAIAdapter, openaiAdapter } from './openai-adapter'
export { ReplicateAdapter, replicateAdapter } from './replicate-adapter'

// Convenience function to get all built-in adapters
import { stabilityAdapter } from './stability-adapter'
import { meshyAdapter } from './meshy-adapter'
import { falAdapter } from './fal-adapter'
import { openaiAdapter } from './openai-adapter'
import { replicateAdapter } from './replicate-adapter'

export const builtInAdapters = [
  stabilityAdapter,
  meshyAdapter,
  falAdapter,
  openaiAdapter,
  replicateAdapter,
]
