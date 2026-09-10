import { logger } from '@trigger.dev/sdk'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { BufferEncoding, ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { imageService } from '@/shared/data/server/image-service'
import {
  CENTER_CROP_OFFSET,
  STABILITY_DEFAULT_MODEL,
  TILE_CROP_SIZE,
} from './generate-tile'
import { readStabilityBase64 } from './generate-tile-json-guards'

function stabilityModel(config: AiProviderConfig): string {
  return config.model ?? STABILITY_DEFAULT_MODEL
}

async function createStabilityInpaintFormData(
  contextImageBase64: string,
  finalPrompt: string
): Promise<FormData> {
  const { mask } = await imageService.assembleContext(
    { targetX: 0, targetY: 0, neighbors: {}, allTiles: {} },
    1024
  )
  const maskBase64 = mask.toString(BufferEncoding.Base64)
  const formData = new FormData()

  const imageBuffer = Buffer.from(contextImageBase64, BufferEncoding.Base64)
  formData.append('init_image', new Blob([imageBuffer], { type: ContentType.Png }), 'image.png')
  formData.append(
    'mask_image',
    new Blob([Buffer.from(maskBase64, BufferEncoding.Base64)], { type: ContentType.Png }),
    'mask.png'
  )
  formData.append('text_prompts[0][text]', finalPrompt)
  formData.append('text_prompts[0][weight]', '1')
  formData.append('cfg_scale', '7')
  formData.append('samples', '1')
  formData.append('steps', '30')
  formData.append('mask_source', 'MASK_IMAGE_BLACK')
  return formData
}

async function generateStabilityFirstTile(
  prompt: string,
  config: AiProviderConfig,
  styleReferenceUrls: string[] | undefined,
  isFirstTile: boolean
): Promise<string> {
  const model = stabilityModel(config)
  const styleRefHint = styleReferenceUrls?.length
    ? ` Style reference: ${styleReferenceUrls.join(', ')}`
    : ''
  const finalPrompt = `Isometric tile for a game world: ${prompt}. Painterly style, detailed, vibrant colors.${styleRefHint}`
  const payload = {
    text_prompts: [{ text: finalPrompt, weight: 1 }],
    cfg_scale: 7,
    width: 1024,
    height: 1024,
    samples: 1,
    steps: 30,
  }

  logLLMRequestStart({
    provider: ImageGenProvider.Stability,
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: payload,
    metadata: { isFirstTile, endpoint: 'text-to-image' },
  })

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: HttpMethod.Post,
        headers: {
          'Content-Type': ContentType.Json,
          Authorization: `Bearer ${config.apiKey}`,
          Accept: ContentType.Json,
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: payload,
      })
      throw new Error(`Stability API error: ${response.status} - ${errorText}`)
    }

    const base64 = readStabilityBase64(await response.json())
    if (!base64) {
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: 'No image data in Stability response',
        input: payload,
      })
      throw new Error('No image data in Stability response')
    }

    logLLMRequestComplete({
      provider: ImageGenProvider.Stability,
      model,
      prompt: finalPrompt,
      outputImageUrls: ['[Base64 Image Data]'],
      output: { hasImage: true },
    })
    return base64
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Stability API error')) {
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: error.message,
        input: payload,
      })
    }
    throw error
  }
}

async function generateStabilityFollowUpTile(
  prompt: string,
  config: AiProviderConfig,
  contextImageBase64: string
): Promise<string> {
  const model = stabilityModel(config)
  const finalPrompt = `Fill seamlessly: ${prompt}. Match surrounding style and edges perfectly, isometric perspective.`
  const formData = await createStabilityInpaintFormData(contextImageBase64, finalPrompt)

  logLLMRequestStart({
    provider: ImageGenProvider.Stability,
    model,
    prompt: finalPrompt,
    inputImageUrls: ['[Context Image Base64]'],
    input: { prompt: finalPrompt, cfg_scale: 7, steps: 30, hasMask: true },
    metadata: { isFirstTile: false, endpoint: 'image-to-image/masking' },
  })

  try {
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image/masking',
      {
        method: HttpMethod.Post,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: ContentType.Json,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: { prompt: finalPrompt },
      })
      throw new Error(`Stability Inpaint API error: ${response.status} - ${errorText}`)
    }

    const base64 = readStabilityBase64(await response.json())
    if (!base64) {
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: 'No image data in Stability response',
        input: { prompt: finalPrompt },
      })
      throw new Error('No image data in Stability response')
    }

    const croppedBuffer = await imageService.crop(Buffer.from(base64, BufferEncoding.Base64), {
      x: CENTER_CROP_OFFSET,
      y: CENTER_CROP_OFFSET,
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
    })

    logLLMRequestComplete({
      provider: ImageGenProvider.Stability,
      model,
      prompt: finalPrompt,
      outputImageUrls: ['[Base64 Image Data]'],
      output: { hasImage: true },
    })
    return croppedBuffer.toString(BufferEncoding.Base64)
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Stability Inpaint API error')) {
      logLLMRequestError({
        provider: ImageGenProvider.Stability,
        model,
        prompt: finalPrompt,
        error: error.message,
        input: { prompt: finalPrompt },
      })
    }
    throw error
  }
}

export async function generateWithStability(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  if (isFirstTile || !contextImageBase64) {
    logger.info('Stability: Generating first tile with style references')
    return generateStabilityFirstTile(prompt, config, styleReferenceUrls, isFirstTile)
  }
  logger.info('Stability: Generating follow-up tile with context image')
  return generateStabilityFollowUpTile(prompt, config, contextImageBase64)
}
