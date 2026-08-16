import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  ApiframeEditModel,
  ApiframeErrorMessage,
  ApiframeFluxFillMode,
} from '@/shared/ai/constants/apiframe'
import { editApiframeImage } from '@/shared/ai/apiframe'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import { v4 as uuidv4 } from 'uuid'
import { buildCenterHoleMaskPng, downloadTileAsBase64 } from './generate-tile-output'

export async function inpaintFollowUpViaFluxFill(input: {
  apiKey: string
  prompt: string
  contextImageUrl: string
}): Promise<string> {
  const maskBuffer = await buildCenterHoleMaskPng()
  const maskUrl = await storageService.uploadPublicImage(
    `tile_mask_${uuidv4()}.png`,
    `data:${ContentType.Png};base64,${maskBuffer.toString(BufferEncoding.Base64)}`,
  )
  if (!maskUrl) {
    throw new Error(ApiframeErrorMessage.NoImages)
  }

  logger.info('Follow-up inpaint via Flux Fill', { contextImageUrl: input.contextImageUrl })
  logLLMRequestStart({
    provider: ImageGenProvider.Apiframe,
    model: ApiframeEditModel.FluxFillPro,
    prompt: input.prompt,
    inputImageUrls: [input.contextImageUrl, maskUrl],
    metadata: { task: 'generate-tile', isFirstTile: false },
  })
  await metadata.set('stage', 'waiting_apiframe')
  await metadata.set('progress', 45)

  try {
    const result = await editApiframeImage({
      apiKey: input.apiKey,
      imageUrl: input.contextImageUrl,
      prompt: input.prompt,
      maskUrl,
      mode: ApiframeFluxFillMode.Inpaint,
      maxAttempts: 120,
    })
    logLLMRequestComplete({
      provider: ImageGenProvider.Apiframe,
      model: ApiframeEditModel.FluxFillPro,
      prompt: input.prompt,
      outputImageUrls: [result.imageUrl],
    })
    await metadata.set('progress', 85)
    return downloadTileAsBase64(result.imageUrl, false)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({
      provider: ImageGenProvider.Apiframe,
      model: ApiframeEditModel.FluxFillPro,
      prompt: input.prompt,
      error: message,
    })
    throw error
  }
}
