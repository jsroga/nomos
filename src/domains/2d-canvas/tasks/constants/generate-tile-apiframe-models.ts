import { logger, metadata } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS, tilePromptLayersFrom } from '@/shared/data/server/prompts'
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
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { TILE_CROP_SIZE } from './generate-tile'

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
): Promise<{ text: string; imageUrls: string[] }> {
  const imageUrls: string[] = []
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  let text = isFirstTile
    ? forMidjourney
      ? GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(layers)
      : GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)
    : forMidjourney
      ? GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(layers)
      : GENERATION_PROMPTS.FOLLOW_UP.GEMINI(layers)
  if (!isFirstTile) {
    const contextUrl = await uploadContextIfPresent(contextImageBase64)
    if (contextUrl) {
      if (forMidjourney) text = `${contextUrl} ${text}`
      else imageUrls.push(contextUrl)
    }
  }
  if (styleReferenceUrls?.length) {
    if (forMidjourney) text += ` --sref ${styleReferenceUrls.join(' ')}`
    else imageUrls.push(...styleReferenceUrls)
  }
  return { text, imageUrls }
}

async function downloadTileAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download Apiframe tile image: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const resized = await sharp(buffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .png()
    .toBuffer()
  return resized.toString(BufferEncoding.Base64)
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
  )

  logger.info('Starting tile generation via Apiframe', { provider, model, isFirstTile })
  logLLMRequestStart({
    provider,
    model,
    prompt: text,
    inputImageUrls: imageUrls.length > 0 ? imageUrls : styleReferenceUrls,
    metadata: { task: 'generate-tile', isFirstTile },
  })
  await metadata.set('stage', 'submitting_apiframe')
  await metadata.set('progress', 35)

  try {
    if (forMidjourney) {
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
      return downloadTileAsBase64(result.imageUrl)
    }

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
    return downloadTileAsBase64(imageUrl)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({ provider, model, prompt: text, error: message })
    throw error
  }
}
