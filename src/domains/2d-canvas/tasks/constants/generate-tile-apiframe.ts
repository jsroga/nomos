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
import { ApiframeImageModel } from '@/shared/ai/constants/apiframe'
import { generateMidjourneyUpscaledImage } from '@/shared/ai/apiframe'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { TILE_CROP_SIZE } from './generate-tile'

async function buildApiframeTilePrompt(
  isFirstTile: boolean,
  prompt: string,
  styleContext: string | undefined,
  contextImageBase64: string | undefined,
  styleReferenceUrls?: string[],
  masterPrompt?: string,
  modePromptFragment?: string,
): Promise<string> {
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  let basePrompt = isFirstTile
    ? GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(layers)
    : GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(layers)
  if (!isFirstTile && contextImageBase64) {
    const tempFilename = `mj_context_${uuidv4()}.png`
    const publicImageUrl = await storageService.uploadPublicImage(tempFilename, contextImageBase64)
    if (publicImageUrl) {
      basePrompt = `${publicImageUrl} ${basePrompt}`
    }
  }
  if (styleReferenceUrls?.length) {
    basePrompt += ` --sref ${styleReferenceUrls.join(' ')}`
  }
  return basePrompt
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
  )

  logLLMRequestStart({
    provider: ImageGenProvider.Midjourney,
    model: ApiframeImageModel.Midjourney,
    prompt: fullPrompt,
    inputImageUrls: styleReferenceUrls,
    metadata: { task: 'generate-tile', isFirstTile },
  })

  await metadata.set('stage', 'submitting_apiframe')
  await metadata.set('progress', 35)

  try {
    await metadata.set('stage', 'waiting_apiframe')
    await metadata.set('progress', 45)
    const result = await generateMidjourneyUpscaledImage(fullPrompt, config.apiKey, {
      aspectRatio: '1:1',
      index: 1,
      maxAttempts: 120,
    })
    await metadata.set('apiframe_job_id', result.upsampleJobId)
    await metadata.set('progress', 85)

    logLLMRequestComplete({
      provider: ImageGenProvider.Midjourney,
      model: ApiframeImageModel.Midjourney,
      prompt: fullPrompt,
      outputImageUrls: [result.imageUrl],
    })

    await metadata.set('stage', 'downloading_result')
    return downloadTileAsBase64(result.imageUrl)
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
