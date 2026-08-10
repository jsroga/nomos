import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { UPSCALE_PROMPTS } from '@/shared/data/server/prompts'
import { ContentType } from '@/shared/data/constants/protocol'
import { generateMidjourneyUpscaledImage } from '@/shared/ai/apiframe'

export async function upscaleWithLegNext(
  imageBase64: string,
  _prompt: string,
  apiKey: string,
  mimeType: string = ContentType.Png,
  styleReferenceUrls?: string[],
  _creativity: number = 0.3
): Promise<{ id: string; imageUrl: string }> {
  logger.info('Starting Midjourney upscale via Apiframe', {
    mimeType,
    styleReferenceUrls,
  })
  await metadata.set('stage', 'uploading_image')
  await metadata.set('progress', 32)

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `upscale_temp_${uuidv4()}.png`

  const publicImageUrl = await storageService.uploadPublicImage(tempFilename, imageBase64)

  if (!publicImageUrl) {
    throw new Error('Failed to upload image for upscaling. Midjourney requires a public URL.')
  }

  logger.info('Image uploaded to public URL', { publicImageUrl })

  let remixPrompt: string = UPSCALE_PROMPTS.MIDJOURNEY
  if (styleReferenceUrls && styleReferenceUrls.length > 0) {
    remixPrompt += ` --sref ${styleReferenceUrls.join(' ')}`
  }
  const fullPrompt = `${publicImageUrl} ${remixPrompt}`.trim()

  await metadata.set('stage', 'submitting_apiframe')
  await metadata.set('progress', 40)

  const result = await generateMidjourneyUpscaledImage(fullPrompt, apiKey, {
    index: 1,
    maxAttempts: 120,
  })

  await metadata.set('stage', 'completed')
  await metadata.set('progress', 100)

  logger.info('Apiframe Midjourney upscale completed', {
    imageUrl: result.imageUrl,
    upsampleJobId: result.upsampleJobId,
  })

  return { id: result.upsampleJobId, imageUrl: result.imageUrl }
}
