import { logger, metadata } from '@trigger.dev/sdk/v3'
import { tilePromptLayersFrom } from '@/shared/data/server/prompts'
import { buildMidjourneyTilePromptText } from '@/shared/data/server/midjourney-params'
import { storageService } from '@/shared/data/storage/storage-service'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeGenerateAspectRatio, ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import { generateMidjourneyUpscaledImage } from '@/shared/ai/apiframe'
import { v4 as uuidv4 } from 'uuid'
import { downloadTileAsBase64 } from './generate-tile-output'
import { packedAspectRatio, type PackedCropSpec } from '@/shared/ai/context-pack-layout'
import {
  GenerateTileProgress,
  GenerateTileStage,
  advanceGenerateTileProgress,
} from './generate-tile-progress'

async function buildApiframeTilePrompt(
  isFirstTile: boolean,
  prompt: string,
  styleContext: string | undefined,
  contextImageBase64: string | undefined,
  styleReferenceUrls?: string[],
  masterPrompt?: string,
  modePromptFragment?: string,
  modeNegatives?: string[],
  styleAnchorUrl?: string,
): Promise<string> {
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  let basePrompt = buildMidjourneyTilePromptText({
    isFirstTile,
    layers,
    styleReferenceUrls,
    modeNegatives,
    styleAnchorUrl,
  })
  if (!isFirstTile && contextImageBase64) {
    const tempFilename = `mj_context_${uuidv4()}.png`
    const publicImageUrl = await storageService.uploadPublicImage(tempFilename, contextImageBase64)
    if (publicImageUrl) {
      basePrompt = `${publicImageUrl} ${basePrompt}`
    }
  }
  return basePrompt
}

/** Midjourney tile generation via Apiframe v2. */
export async function generateWithApiframeMidjourney(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string,
  styleContext?: string,
  masterPrompt?: string,
  modePromptFragment?: string,
  modeNegatives?: string[],
  styleAnchorUrl?: string,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  logger.info('Starting Midjourney generation via Apiframe', { isFirstTile, styleReferenceUrls })

  const fullPrompt = await buildApiframeTilePrompt(
    isFirstTile,
    prompt,
    styleContext,
    contextImageBase64,
    styleReferenceUrls,
    masterPrompt,
    modePromptFragment,
    modeNegatives,
    styleAnchorUrl,
  )
  logger.info('Midjourney prompt', { prompt: fullPrompt })

  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    inputImageUrls: styleReferenceUrls,
    metadata: { task: 'generate-tile', isFirstTile },
  })

  await advanceGenerateTileProgress(
    GenerateTileProgress.Submitting,
    GenerateTileStage.SubmittingApiframe,
  )

  try {
    await advanceGenerateTileProgress(
      GenerateTileProgress.Waiting,
      GenerateTileStage.WaitingApiframe,
    )
    const result = await generateMidjourneyUpscaledImage(fullPrompt, config.apiKey, {
      aspectRatio:
        !isFirstTile && packedCrop
          ? packedAspectRatio(packedCrop.packedWidth, packedCrop.packedHeight)
          : ApiframeGenerateAspectRatio.Square,
      index: 1,
      maxAttempts: 120,
    })
    await metadata.set('apiframe_job_id', result.upsampleJobId)
    await advanceGenerateTileProgress(
      GenerateTileProgress.Downloaded,
      GenerateTileStage.DownloadingResult,
    )

    logLLMRequestComplete({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      outputImageUrls: [result.imageUrl],
    })

    return downloadTileAsBase64(result.imageUrl, isFirstTile, packedCrop)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      error: message,
    })
    throw error
  }
}
