import { logger } from '@trigger.dev/sdk'
import { UpscaleStrategy } from '../constants/generation-modes'
import { topazEnhanceModelFromMode } from '../constants/topaz-upscale'
import { runGeminiPreUpscaleStep } from './upscale-tile-gemini-step'
import { upscaleNearestNeighbour } from './upscale-tile-nearest-provider'
import { upscaleWithApiframe } from './upscale-tile-apiframe-provider'
import type { ProviderConfig } from './upscale-tile-provider-types'
import { resolveImageUpscaleMode } from '@/shared/ai/image-model-env'
import { ApiframeUpscaleModel } from '@/shared/ai/constants/apiframe'

interface ModeUpscaleResult {
  finalImageUrl: string | null
  finalImageBase64: string | null
}

export async function runModeUpscale(params: {
  upscaleStrategy: UpscaleStrategy
  providerConfig: ProviderConfig
  imageBase64: string
  prompt: string
  creativity: number
  styleReferenceUrls?: string[]
  geminiConfig?: { apiKey: string; model?: string }
}): Promise<ModeUpscaleResult> {
  const {
    upscaleStrategy,
    providerConfig,
    imageBase64,
    prompt,
    creativity,
    styleReferenceUrls,
    geminiConfig,
  } = params

  if (upscaleStrategy === UpscaleStrategy.NearestNeighbour) {
    const data = await upscaleNearestNeighbour(imageBase64)
    return { finalImageUrl: null, finalImageBase64: data }
  }

  let stepImage = imageBase64
  if (geminiConfig) {
    const step = await runGeminiPreUpscaleStep({
      imageBase64,
      prompt,
      creativity,
      geminiConfig,
      styleReferenceUrls,
    })
    stepImage = step.step1Image
  }

  const modelType = topazEnhanceModelFromMode(resolveImageUpscaleMode())
  logger.info('Running Topaz upscale via Apiframe', {
    model: ApiframeUpscaleModel.TopazImageUpscale,
    modelType,
  })
  const result = await upscaleWithApiframe(stepImage, providerConfig.apiKey, { modelType })
  return { finalImageUrl: result.imageUrl, finalImageBase64: null }
}
