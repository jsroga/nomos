import { logger } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS } from '@/shared/data/server/prompts'
import {
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  OpenRouterImageAspectRatio,
  OpenRouterImageModel,
  OpenRouterImagePath,
  OpenRouterImageResolution,
} from '@/shared/ai/constants/openrouter-image'
import { OPENROUTER_BASE_URL } from '@/shared/agent-kernel/models'
import { BufferEncoding, ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import { imageService } from '@/shared/data/server/image-service'
import sharp from 'sharp'
import {
  CENTER_CROP_OFFSET,
  CONTEXT_CANVAS_SIZE,
  TILE_CROP_SIZE,
} from './generate-tile'
import { readOpenAiB64Json } from './generate-tile-json-guards'

enum OpenRouterImageInputType {
  ImageUrl = 'image_url',
}

interface OpenRouterImageReference {
  type: OpenRouterImageInputType.ImageUrl
  image_url: { url: string }
}

function resolveGrokModel(config: AiProviderConfig): string {
  return config.params?.modelId ?? config.model ?? OpenRouterImageModel.GrokImagineImageQuality
}

function buildContextDataUrl(contextImageBase64: string): string {
  return `data:${ContentType.Png};base64,${contextImageBase64}`
}

async function cropFollowUpCanvas(imageData: string): Promise<string> {
  let imgBuffer = Buffer.from(imageData, BufferEncoding.Base64)
  const meta = await sharp(imgBuffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  logger.info('Grok output dimensions', { width: w, height: h })

  if (w !== CONTEXT_CANVAS_SIZE || h !== CONTEXT_CANVAS_SIZE) {
    logger.warn('Grok output is not 1024x1024, resizing before crop', { width: w, height: h })
    imgBuffer = Buffer.from(
      await sharp(imgBuffer).resize(CONTEXT_CANVAS_SIZE, CONTEXT_CANVAS_SIZE, { fit: 'fill' }).png().toBuffer()
    )
  }
  imgBuffer = Buffer.from(
    await imageService.crop(imgBuffer, {
      x: CENTER_CROP_OFFSET,
      y: CENTER_CROP_OFFSET,
      width: TILE_CROP_SIZE,
      height: TILE_CROP_SIZE,
    })
  )
  return imgBuffer.toString(BufferEncoding.Base64)
}

async function resizeFirstTileOutput(imageData: string): Promise<string> {
  const imgBuffer = Buffer.from(imageData, BufferEncoding.Base64)
  const meta = await sharp(imgBuffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w === TILE_CROP_SIZE && h === TILE_CROP_SIZE) {
    return imageData
  }
  const resized = await sharp(imgBuffer)
    .resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' })
    .png()
    .toBuffer()
  return resized.toString(BufferEncoding.Base64)
}

/**
 * Follow-up (and optional first-tile) generation via OpenRouter Image API → Grok Imagine.
 * @see https://openrouter.ai/x-ai/grok-imagine-image-quality
 */
export async function generateWithGrok(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls: string[] | undefined,
  contextImageBase64: string | undefined,
  styleContext: string | undefined
): Promise<string> {
  const model = resolveGrokModel(config)
  const isFollowUp = !isFirstTile && !!contextImageBase64
  const finalPrompt = isFollowUp
    ? GENERATION_PROMPTS.FOLLOW_UP.GEMINI(prompt, styleContext ?? 'consistent art style')
    : GENERATION_PROMPTS.FIRST_TILE.GEMINI(prompt, styleContext)

  const inputReferences: OpenRouterImageReference[] = []
  if (contextImageBase64) {
    inputReferences.push({
      type: OpenRouterImageInputType.ImageUrl,
      image_url: { url: buildContextDataUrl(contextImageBase64) },
    })
  }
  for (const url of styleReferenceUrls ?? []) {
    inputReferences.push({
      type: OpenRouterImageInputType.ImageUrl,
      image_url: { url },
    })
  }

  const payload = {
    model,
    prompt: finalPrompt,
    n: 1,
    aspect_ratio: OpenRouterImageAspectRatio.Square,
    resolution: OpenRouterImageResolution.OneK,
    ...(inputReferences.length > 0 ? { input_references: inputReferences } : {}),
  }

  logLLMRequestStart({
    provider: ImageGenProvider.Grok,
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: { ...payload, input_references: inputReferences.map((r) => r.image_url.url.slice(0, 64)) },
    metadata: { isFirstTile, endpoint: OpenRouterImagePath.Images },
  })

  const response = await fetch(`${OPENROUTER_BASE_URL}${OpenRouterImagePath.Images}`, {
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
      provider: ImageGenProvider.Grok,
      model,
      prompt: finalPrompt,
      error: `HTTP ${response.status}: ${errorText}`,
      input: payload,
    })
    throw new Error(`OpenRouter Grok image error: ${response.status} - ${errorText}`)
  }

  const b64 = readOpenAiB64Json(await response.json())
  if (!b64) {
    logLLMRequestError({
      provider: ImageGenProvider.Grok,
      model,
      prompt: finalPrompt,
      error: 'No image data in OpenRouter response',
      input: payload,
    })
    throw new Error('No image data in OpenRouter Grok response')
  }

  if (isFollowUp) {
    return cropFollowUpCanvas(b64)
  }
  return resizeFirstTileOutput(b64)
}
