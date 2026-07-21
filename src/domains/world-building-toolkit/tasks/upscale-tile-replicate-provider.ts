import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import {
  isReplicateModelId,
  parseReplicateImageOutput,
} from '@/shared/ai/replicate-output'

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
  const inputImageUrl = await storageService.uploadPublicImage(
    tempFilename,
    imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
  )

  if (!inputImageUrl) {
    throw new Error('Failed to upload input image for Replicate')
  }

  logger.info('Input image uploaded for Replicate', { inputImageUrl })

  if (!isReplicateModelId(model)) {
    throw new Error(`Invalid Replicate model id: ${model}`)
  }
  const output: unknown = await replicate.run(model, {
    input: {
      image: inputImageUrl,
      prompt,
    },
  })

  logger.info('Replicate raw output:', {
    type: typeof output,
    isArray: Array.isArray(output),
    keys: typeof output === 'object' && output ? Object.keys(output) : [],
    stringified: JSON.stringify(output).substring(0, 500),
  })

  await metadata.set('progress', 100)

  return parseReplicateImageOutput(output)
}
