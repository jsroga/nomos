import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { BufferEncoding, ContentType, UrlScheme } from '@/shared/data/constants/protocol'
import {
  ApiframeTopazModelType,
  ApiframeTopazUpscaleFactor,
  ApiframeUpscaleModel,
} from '@/shared/ai/constants/apiframe'
import { upscaleApiframeImage } from '@/shared/ai/apiframe'
import { resolveImageUpscaleMode } from '@/shared/ai/image-model-env'
import {
  resolveTopazUpscalePlan,
  topazEnhanceModelFromMode,
} from '../constants/topaz-upscale'

export async function upscaleWithApiframe(
  imageBase64: string,
  apiKey: string,
  options?: {
    modelType?: ApiframeTopazModelType
    factor?: ApiframeTopazUpscaleFactor
  },
): Promise<{ id: string; imageUrl: string }> {
  const model = ApiframeUpscaleModel.TopazImageUpscale
  const modelType = options?.modelType ?? topazEnhanceModelFromMode(resolveImageUpscaleMode())
  const factor = options?.factor ?? (await factorFromImage(imageBase64))
  logger.info('Starting image upscale via Apiframe', { model, modelType, factor })
  await metadata.set('stage', 'uploading_image')
  await metadata.set('progress', 32)

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `upscale_temp_${uuidv4()}.png`
  const payload = imageBase64.startsWith(UrlScheme.Data)
    ? imageBase64
    : `data:${ContentType.Png};base64,${imageBase64}`
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
    upscaleFactor: factor,
    modelType,
    maxAttempts: 120,
  })

  await metadata.set('stage', 'completed')
  await metadata.set('progress', 100)

  logger.info('Apiframe upscale completed', {
    imageUrl: result.imageUrl,
    jobId: result.jobId,
    model,
    modelType,
    factor,
  })

  return { id: result.jobId, imageUrl: result.imageUrl }
}

async function factorFromImage(imageBase64: string): Promise<ApiframeTopazUpscaleFactor> {
  const sharp = (await import('sharp')).default
  const buffer = Buffer.from(
    imageBase64.replace(/^data:image\/\w+;base64,/, ''),
    BufferEncoding.Base64,
  )
  const meta = await sharp(buffer).metadata()
  return resolveTopazUpscalePlan(meta.width ?? 1, meta.height ?? 1).factor
}
