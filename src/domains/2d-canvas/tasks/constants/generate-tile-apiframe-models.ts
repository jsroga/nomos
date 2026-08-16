import { logger, metadata } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS, tilePromptLayersFrom } from '@/shared/data/server/prompts'
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
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import {
  generateApiframeImage,
  generateMidjourneyUpscaledImage,
  pickApiframeImageUrl,
  resolveNanoBananaModel,
} from '@/shared/ai/apiframe'
import { ContentType } from '@/shared/data/constants/protocol'
import { v4 as uuidv4 } from 'uuid'
import { downloadTileAsBase64 } from './generate-tile-output'
import { inpaintFollowUpViaFluxFill } from './generate-tile-apiframe-inpaint'

const TILE_ASPECT_RATIO = '1:1'

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
  const imageUrls: string[] = []
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
    : isFirstTile
      ? GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)
      : GENERATION_PROMPTS.FOLLOW_UP.MASTER(layers)
  if (!isFirstTile) {
    const contextUrl = await uploadContextIfPresent(contextImageBase64)
    if (contextUrl) {
      if (forMidjourney) text = `${contextUrl} ${text}`
      else imageUrls.push(contextUrl)
    }
  }
  if (!forMidjourney && styleReferenceUrls?.length) {
    imageUrls.push(...styleReferenceUrls)
  }
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

  logger.info('Starting tile generation via Apiframe', { provider, model, isFirstTile })
  if (forMidjourney) {
    logger.info('Midjourney prompt', { prompt: text })
  }
  await metadata.set('stage', 'submitting_apiframe')
  await metadata.set('progress', 35)

  const [contextImageUrl] = imageUrls
  if (!forMidjourney && !isFirstTile && contextImageUrl) {
    return inpaintFollowUpViaFluxFill({
      apiKey: config.apiKey,
      prompt: text,
      contextImageUrl,
    })
  }

  try {
    if (forMidjourney) {
      logLLMRequestStart({
        provider,
        model,
        prompt: text,
        inputImageUrls: imageUrls.length > 0 ? imageUrls : styleReferenceUrls,
        metadata: { task: 'generate-tile', isFirstTile },
      })
      const result = await generateMidjourneyUpscaledImage(text, config.apiKey, {
        aspectRatio: TILE_ASPECT_RATIO,
        index: 1,
        maxAttempts: 120,
      })
      logLLMRequestComplete({
        provider,
        model,
        prompt: text,
        outputImageUrls: [result.imageUrl],
      })
      return downloadTileAsBase64(result.imageUrl, isFirstTile)
    }

    logLLMRequestStart({
      provider,
      model,
      prompt: text,
      inputImageUrls: imageUrls.length > 0 ? imageUrls : styleReferenceUrls,
      metadata: { task: 'generate-tile', isFirstTile },
    })
    await metadata.set('stage', 'waiting_apiframe')
    await metadata.set('progress', 45)
    const result = await generateApiframeImage({
      model,
      prompt: text,
      apiKey: config.apiKey,
      aspectRatio: TILE_ASPECT_RATIO,
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
    await metadata.set('progress', 85)
    return downloadTileAsBase64(imageUrl, isFirstTile)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({ provider, model, prompt: text, error: message })
    throw error
  }
}
