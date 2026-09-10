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
  OPENAI_DEFAULT_MODEL,
  OPENAI_EDIT_MODEL,
  TILE_CROP_SIZE,
} from './generate-tile'
import { readOpenAiB64Json } from './generate-tile-json-guards'

async function createOpenAiEditFormData(
  contextImageBase64: string,
  finalPrompt: string
): Promise<FormData> {
  const formData = new FormData()
  const imageBuffer = Buffer.from(contextImageBase64, BufferEncoding.Base64)
  const imageBlob = new Blob([imageBuffer], { type: ContentType.Png })
  formData.append('image', imageBlob, 'image.png')

  const { mask } = await imageService.assembleContext(
    { targetX: 0, targetY: 0, neighbors: {}, allTiles: {} },
    1024
  )
  formData.append('mask', new Blob([new Uint8Array(mask)], { type: ContentType.Png }), 'mask.png')
  formData.append('prompt', finalPrompt)
  formData.append('n', '1')
  formData.append('size', '1024x1024')
  formData.append('response_format', 'b64_json')
  return formData
}

async function generateOpenAiFirstTile(
  prompt: string,
  config: AiProviderConfig,
  styleReferenceUrls: string[] | undefined,
  isFirstTile: boolean
): Promise<string> {
  const model = config.model ?? OPENAI_DEFAULT_MODEL
  const styleRefHint = styleReferenceUrls?.length
    ? ` Style references: ${styleReferenceUrls.join(', ')}.`
    : ''
  const finalPrompt = `Isometric tile for a game world: ${prompt}. 512x512, painterly style, detailed.${styleRefHint}`
  const payload = {
    model,
    prompt: finalPrompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  }

  logLLMRequestStart({
    provider: ImageGenProvider.OpenAi,
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: payload,
    metadata: { isFirstTile, endpoint: 'images/generations' },
  })

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: HttpMethod.Post,
      headers: {
        'Content-Type': ContentType.Json,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: payload,
      })
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const b64 = readOpenAiB64Json(await response.json())
    if (!b64) {
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model,
        prompt: finalPrompt,
        error: 'No image data in OpenAI response',
        input: payload,
      })
      throw new Error('No image data in OpenAI response')
    }

    logLLMRequestComplete({
      provider: ImageGenProvider.OpenAi,
      model,
      prompt: finalPrompt,
      outputImageUrls: ['[Base64 Image Data]'],
      output: { hasImage: true },
    })
    return b64
  } catch (error) {
    if (error instanceof Error && !error.message.includes('OpenAI API error')) {
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model,
        prompt: finalPrompt,
        error: error.message,
        input: payload,
      })
    }
    throw error
  }
}

async function generateOpenAiFollowUpTile(
  prompt: string,
  config: AiProviderConfig,
  contextImageBase64: string
): Promise<string> {
  const finalPrompt = `Fill seamlessly: ${prompt}. Match surrounding style, continuous edges, isometric perspective.`
  const formData = await createOpenAiEditFormData(contextImageBase64, finalPrompt)

  logLLMRequestStart({
    provider: ImageGenProvider.OpenAi,
    model: OPENAI_EDIT_MODEL,
    prompt: finalPrompt,
    inputImageUrls: ['[Context Image Base64]'],
    input: { prompt: finalPrompt, size: '1024x1024', hasMask: true },
    metadata: { isFirstTile: false, endpoint: 'images/edits' },
  })

  try {
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: HttpMethod.Post,
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model: OPENAI_EDIT_MODEL,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: { prompt: finalPrompt },
      })
      throw new Error(`OpenAI Edit API error: ${response.status} - ${errorText}`)
    }

    const b64 = readOpenAiB64Json(await response.json())
    if (!b64) {
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model: OPENAI_EDIT_MODEL,
        prompt: finalPrompt,
        error: 'No image data in OpenAI response',
        input: { prompt: finalPrompt },
      })
      throw new Error('No image data in OpenAI response')
    }

    const croppedBuffer = await imageService.crop(Buffer.from(b64, BufferEncoding.Base64), {
      x: CENTER_CROP_OFFSET,
      y: CENTER_CROP_OFFSET,
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
    })

    logLLMRequestComplete({
      provider: ImageGenProvider.OpenAi,
      model: OPENAI_EDIT_MODEL,
      prompt: finalPrompt,
      outputImageUrls: ['[Base64 Image Data]'],
      output: { hasImage: true },
    })
    return croppedBuffer.toString(BufferEncoding.Base64)
  } catch (error) {
    if (error instanceof Error && !error.message.includes('OpenAI Edit API error')) {
      logLLMRequestError({
        provider: ImageGenProvider.OpenAi,
        model: OPENAI_EDIT_MODEL,
        prompt: finalPrompt,
        error: error.message,
        input: { prompt: finalPrompt },
      })
    }
    throw error
  }
}

export async function generateWithOpenAI(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  if (isFirstTile || !contextImageBase64) {
    logger.info('OpenAI: Generating first tile with style references')
    return generateOpenAiFirstTile(prompt, config, styleReferenceUrls, isFirstTile)
  }
  logger.info('OpenAI: Generating follow-up tile with context image')
  return generateOpenAiFollowUpTile(prompt, config, contextImageBase64)
}
