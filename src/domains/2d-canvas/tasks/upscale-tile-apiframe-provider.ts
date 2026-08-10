import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { ContentType, UrlScheme } from '@/shared/data/constants/protocol'
import {
  ApiframeUpscaleModel,
} from '@/shared/ai/constants/apiframe'
import { upscaleApiframeImage } from '@/shared/ai/apiframe'

export async function upscaleWithApiframe(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: ApiframeUpscaleModel = ApiframeUpscaleModel.TopazImageUpscale,
  mimeType: string = ContentType.Png,
): Promise<{ id: string; imageUrl: string }> {
  logger.info('Starting image upscale via Apiframe', { model, mimeType })
  await metadata.set('stage', 'uploading_image')
  await metadata.set('progress', 32)

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `upscale_temp_${uuidv4()}.png`
  const payload = imageBase64.startsWith(UrlScheme.Data)
    ? imageBase64
    : `data:${mimeType};base64,${imageBase64}`
  const publicImageUrl = await storageService.uploadPublicImage(tempFilename, payload)

  if (!publicImageUrl) {
    throw new Error('Failed to upload image for upscaling')
  }

  await metadata.set('stage', 'submitting_apiframe_upscale')
  await metadata.set('progress', 45)

  const result = await upscaleApiframeImage({
    apiKey,
    model,
    imageUrl: publicImageUrl,
    prompt: model === ApiframeUpscaleModel.ClarityUpscale ? prompt : undefined,
    upscaleFactor: 2,
    maxAttempts: 120,
  })

  await metadata.set('stage', 'completed')
  await metadata.set('progress', 100)

  logger.info('Apiframe upscale completed', {
    imageUrl: result.imageUrl,
    jobId: result.jobId,
    model,
  })

  return { id: result.jobId, imageUrl: result.imageUrl }
}
