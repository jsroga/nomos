import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import {
  isReplicateModelId,
  parseReplicateImageOutput,
} from '@/shared/ai/replicate-output'
import {
  TOPAZ_REPLICATE_MODEL,
  TopazOutputFormat,
  resolveTopazUpscalePlan,
  topazEnhanceModelFromMode,
} from '../constants/topaz-upscale'
import { resolveImageUpscaleMode } from '@/shared/ai/image-model-env'

export async function upscaleWithReplicate(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string
): Promise<{ type: 'url' | 'base64'; data: string }> {
  logger.info('Starting Replicate upscale', { model })
  await metadata.set('stage', 'replicate_processing')

  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: apiKey })

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `replicate_input_${uuidv4()}.png`
  const payload = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:${ContentType.Png};base64,${imageBase64}`
  const inputImageUrl = await storageService.uploadPublicImage(tempFilename, payload)

  if (!inputImageUrl) {
    throw new Error('Failed to upload input image for Replicate')
  }

  logger.info('Input image uploaded for Replicate', { inputImageUrl })

  if (!isReplicateModelId(model)) {
    throw new Error(`Invalid Replicate model id: ${model}`)
  }

  const input =
    model === TOPAZ_REPLICATE_MODEL
      ? await buildTopazInput(imageBase64, inputImageUrl)
      : { image: inputImageUrl, prompt }

  const output: unknown = await replicate.run(model, { input })

  logger.info('Replicate raw output:', {
    type: typeof output,
    isArray: Array.isArray(output),
    keys: typeof output === 'object' && output ? Object.keys(output) : [],
    stringified: JSON.stringify(output).substring(0, 500),
  })

  await metadata.set('progress', 100)

  return parseReplicateImageOutput(output)
}

async function buildTopazInput(
  imageBase64: string,
  inputImageUrl: string
): Promise<Record<string, unknown>> {
  const sharp = (await import('sharp')).default
  const buffer = Buffer.from(
    imageBase64.replace(/^data:image\/\w+;base64,/, ''),
    BufferEncoding.Base64
  )
  const meta = await sharp(buffer).metadata()
  const plan = resolveTopazUpscalePlan(meta.width ?? 1, meta.height ?? 1)
  const enhanceModel = topazEnhanceModelFromMode(resolveImageUpscaleMode())
  logger.info('Topaz upscale job', {
    megapixels: plan.megapixels,
    outputWidth: plan.outputWidth,
    outputHeight: plan.outputHeight,
    factor: plan.factor,
    enhanceModel,
  })
  return {
    image: inputImageUrl,
    enhance_model: enhanceModel,
    upscale_factor: plan.factor,
    output_format: TopazOutputFormat.Png,
    face_enhancement: false,
  }
}
