import { logger } from '@trigger.dev/sdk/v3'
import { ReplicateImageOutputType } from '@/shared/ai/constants/replicate-output'
import { UpscaleStrategy } from '../constants/generation-modes'
import { TOPAZ_REPLICATE_MODEL } from '../constants/topaz-upscale'
import { runGeminiPreUpscaleStep } from './upscale-tile-gemini-step'
import { upscaleNearestNeighbour } from './upscale-tile-nearest-provider'
import { upscaleWithReplicate } from './upscale-tile-replicate-provider'
import type { ProviderConfig } from './upscale-tile-provider-types'

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

  logger.info('Running Topaz upscale via Replicate', { model: TOPAZ_REPLICATE_MODEL })
  const result = await upscaleWithReplicate(
    stepImage,
    prompt,
    providerConfig.apiKey,
    TOPAZ_REPLICATE_MODEL
  )
  if (result.type === ReplicateImageOutputType.Url) {
    return { finalImageUrl: result.data, finalImageBase64: null }
  }
  return { finalImageUrl: null, finalImageBase64: result.data }
}
