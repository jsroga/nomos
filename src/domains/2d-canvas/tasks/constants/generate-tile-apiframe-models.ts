import { logger } from '@trigger.dev/sdk'
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
import {
  ApiframeErrorMessage,
  ApiframeGenerateAspectRatio,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import {
  generateApiframeImage,
  generateMidjourneyUpscaledImage,
  pickApiframeImageUrl,
  resolveNanoBananaModel,
} from '@/shared/ai/apiframe'
import { ContentType, BufferEncoding } from '@/shared/data/constants/protocol'
import { v4 as uuidv4 } from 'uuid'
import { assertTilePngSize } from './generate-tile-output'
import { downloadTileWithFollowUpSeams } from './generate-tile-seams'
import {
  apiframeFollowUpImageUrls,
  composeNonMidjourneyTilePrompt,
} from './generate-tile-apiframe-prompt'
import { packedAspectRatio, type PackedCropSpec } from '@/shared/ai/context-pack-layout'
import {
  GenerateTileProgress,
  GenerateTileStage,
  advanceGenerateTileProgress,
} from './generate-tile-progress'
import type { NeighborImageUrls } from '../../core/neighbor-image-urls'

async function downloadGeneratedTile(
  imageUrl: string,
  isFirstTile: boolean,
  packedCrop: PackedCropSpec | undefined,
  contextImageBase64: string | undefined,
): Promise<string> {
  const tile = await downloadTileWithFollowUpSeams(
    imageUrl,
    isFirstTile,
    contextImageBase64,
    packedCrop,
  )
  const tileBuffer = Buffer.from(tile, BufferEncoding.Base64)
  await assertTilePngSize(tileBuffer)
  return tile
}

async function uploadContextIfPresent(
  contextImageBase64: string | undefined,
): Promise<string | undefined> {
  if (!contextImageBase64) return undefined
  const tempFilename = `tile_context_${uuidv4()}.png`
  const payload = contextImageBase64.startsWith('data:')
    ? contextImageBase64
    : `data:${ContentType.Png};base64,${contextImageBase64}`
  return (await storageService.uploadPublicImage(tempFilename, payload)) ?? undefined
}

async function buildTilePrompt(
  isFirstTile: boolean,
  prompt: string,
  styleContext: string | undefined,
  contextImageBase64: string | undefined,
  styleReferenceUrls: string[] | undefined,
  forMidjourney: boolean,
  masterPrompt?: string,
  modePromptFragment?: string,
  modeNegatives?: string[],
  styleAnchorUrl?: string,
): Promise<{ text: string; imageUrls: string[] }> {
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  let text = forMidjourney
    ? buildMidjourneyTilePromptText({
        isFirstTile,
        layers,
        styleReferenceUrls,
        modeNegatives,
        styleAnchorUrl,
      })
    : composeNonMidjourneyTilePrompt(isFirstTile, layers, modeNegatives)
  const contextUrl = isFirstTile
    ? undefined
    : await uploadContextIfPresent(contextImageBase64)
  if (contextUrl && forMidjourney) text = `${contextUrl} ${text}`
  const imageUrls = apiframeFollowUpImageUrls(
    isFirstTile,
    forMidjourney ? undefined : contextUrl,
  )
  return { text, imageUrls }
}

function mapProviderToApiframeModel(
  provider: ImageGenProvider,
  config: AiProviderConfig,
): ApiframeImageModel {
  switch (provider) {
    case ImageGenProvider.Grok:
      return ApiframeImageModel.GrokImagineImage
    case ImageGenProvider.Gemini:
    case ImageGenProvider.NanoBanana:
      return resolveNanoBananaModel(config.params?.modelId ?? config.model)
    case ImageGenProvider.OpenAi:
      return ApiframeImageModel.GptImage15
    case ImageGenProvider.Stability:
      return ApiframeImageModel.Flux2Pro
    case ImageGenProvider.Midjourney:
      return ApiframeImageModel.Midjourney
    default:
      return ApiframeImageModel.NanoBanana
  }
}

/** Non-Midjourney tile generation via Apiframe (Grok / Nano Banana / GPT Image / Flux). */
export async function generateTileViaApiframeModel(
  provider: ImageGenProvider,
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls: string[] | undefined,
  contextImageBase64: string | undefined,
  styleContext: string | undefined,
  masterPrompt?: string,
  modePromptFragment?: string,
  modeNegatives?: string[],
  styleAnchorUrl?: string,
  _neighborImageUrls?: NeighborImageUrls,
  packedCrop?: PackedCropSpec,
): Promise<string> {
  const model = mapProviderToApiframeModel(provider, config)
  const forMidjourney = model === ApiframeImageModel.Midjourney
  const { text, imageUrls } = await buildTilePrompt(
    isFirstTile,
    prompt,
    styleContext,
    contextImageBase64,
    styleReferenceUrls,
    forMidjourney,
    masterPrompt,
    modePromptFragment,
    modeNegatives,
    styleAnchorUrl,
  )
  const aspectRatio =
    !isFirstTile && packedCrop
      ? packedAspectRatio(packedCrop.packedWidth, packedCrop.packedHeight)
      : ApiframeGenerateAspectRatio.Square

  logger.info('Starting tile generation via Apiframe', { provider, model, isFirstTile })
  if (forMidjourney) {
    logger.info('Midjourney prompt', { prompt: text })
  }
  await advanceGenerateTileProgress(
    GenerateTileProgress.Submitting,
    GenerateTileStage.SubmittingApiframe,
  )

  try {
    if (forMidjourney) {
      logLLMRequestStart({
        provider,
        model,
        prompt: text,
        inputImageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        metadata: { task: 'generate-tile', isFirstTile },
      })
      const result = await generateMidjourneyUpscaledImage(text, config.apiKey, {
        aspectRatio,
        index: 1,
        maxAttempts: 120,
      })
      logLLMRequestComplete({
        provider,
        model,
        prompt: text,
        outputImageUrls: [result.imageUrl],
      })
      return downloadGeneratedTile(result.imageUrl, isFirstTile, packedCrop, contextImageBase64)
    }

    logLLMRequestStart({
      provider,
      model,
      prompt: text,
      inputImageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      metadata: { task: 'generate-tile', isFirstTile },
    })
    await advanceGenerateTileProgress(
      GenerateTileProgress.Waiting,
      GenerateTileStage.WaitingApiframe,
    )
    const result = await generateApiframeImage({
      model,
      prompt: text,
      apiKey: config.apiKey,
      aspectRatio,
      imageInputUrls: imageUrls.length > 0 ? imageUrls : undefined,
      maxAttempts: 120,
    })
    const imageUrl = pickApiframeImageUrl(result)
    if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
    logLLMRequestComplete({
      provider,
      model,
      prompt: text,
      outputImageUrls: [imageUrl],
    })
    await advanceGenerateTileProgress(
      GenerateTileProgress.Downloaded,
      GenerateTileStage.DownloadingResult,
    )
    return downloadGeneratedTile(imageUrl, isFirstTile, packedCrop, contextImageBase64)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({ provider, model, prompt: text, error: message })
    throw error
  }
}
