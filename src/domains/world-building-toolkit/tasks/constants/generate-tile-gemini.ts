import { logger } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS } from '@/shared/data/server/prompts'
import {
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { imageService } from '@/shared/data/server/image-service'
import sharp from 'sharp'
import {
  CENTER_CROP_OFFSET,
  CONTEXT_CANVAS_SIZE,
  GEMINI_DEFAULT_MODEL,
  TILE_CROP_SIZE,
} from './generate-tile'
import {
  parseGeminiResponse,
  readGeminiImageData,
  type GeminiContentPart,
} from './generate-tile-json-guards'
import { extractGeminiImageData } from './generate-tile-gemini-response'

interface GeminiInlineDataPart {
  inline_data: { mime_type: string; data: string }
}

interface GeminiTextPart {
  text: string
}

type GeminiPayloadPart = GeminiTextPart | GeminiInlineDataPart

interface GeminiRequestPayload {
  contents: Array<{ parts: GeminiPayloadPart[] }>
  generationConfig: {
    responseModalities: string[]
    temperature: number
    topK: number
    topP: number
  }
}

async function fetchStyleImageParts(styleReferenceUrls: string[]): Promise<GeminiInlineDataPart[]> {
  const parts: GeminiInlineDataPart[] = []
  for (const url of styleReferenceUrls) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue
      const arrayBuffer = await resp.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const contentType = resp.headers.get('content-type') ?? 'image/png'
      parts.push({ inline_data: { mime_type: contentType, data: base64 } })
    } catch {
      // skip unreachable URLs
    }
  }
  return parts
}

function buildGeminiPayload(
  isFirstTile: boolean,
  prompt: string,
  styleContext: string | undefined,
  contextImageBase64: string | undefined,
  styleImageParts: GeminiInlineDataPart[]
): { payload: GeminiRequestPayload; finalPrompt: string } {
  if (isFirstTile || !contextImageBase64) {
    const finalPrompt = GENERATION_PROMPTS.FIRST_TILE.GEMINI(prompt, styleContext)
    return {
      finalPrompt,
      payload: {
        contents: [{ parts: [{ text: finalPrompt }, ...styleImageParts] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 0.4,
          topK: 32,
          topP: 1,
        },
      },
    }
  }

  const finalPrompt = GENERATION_PROMPTS.FOLLOW_UP.GEMINI(
    prompt,
    styleContext ?? 'consistent art style'
  )
  return {
    finalPrompt,
    payload: {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: 'image/png', data: contextImageBase64 } },
            ...styleImageParts,
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.4,
        topK: 32,
        topP: 1,
      },
    },
  }
}

async function resizeGeminiFollowUpOutput(imageData: string): Promise<string> {
  let imgBuffer = Buffer.from(imageData, 'base64')
  const meta = await sharp(imgBuffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  logger.info('Gemini output dimensions', { width: w, height: h })

  if (w !== CONTEXT_CANVAS_SIZE || h !== CONTEXT_CANVAS_SIZE) {
    logger.warn('Gemini output is not 1024x1024, resizing before crop', { width: w, height: h })
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
  return imgBuffer.toString('base64')
}

async function resizeGeminiFirstTileOutput(imageData: string): Promise<string> {
  const imgBuffer = Buffer.from(imageData, 'base64')
  const meta = await sharp(imgBuffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  logger.info('Gemini output dimensions', { width: w, height: h })
  if (w === TILE_CROP_SIZE && h === TILE_CROP_SIZE) {
    return imageData
  }
  logger.info('Resizing Gemini output to 512x512', { from: `${w}x${h}` })
  const resized = await sharp(imgBuffer).resize(TILE_CROP_SIZE, TILE_CROP_SIZE, { fit: 'cover' }).png().toBuffer()
  return resized.toString('base64')
}

async function processGeminiImagePart(
  imagePart: GeminiContentPart,
  isFirstTile: boolean,
  contextImageBase64: string | undefined
): Promise<string> {
  const rawData = readGeminiImageData(imagePart)
  if (!rawData) {
    throw new Error('Gemini image part missing inline data')
  }
  if (!isFirstTile && contextImageBase64) {
    return resizeGeminiFollowUpOutput(rawData)
  }
  return resizeGeminiFirstTileOutput(rawData)
}

export async function generateWithGemini(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string,
  styleContext?: string
): Promise<string> {
  const model = config.params?.modelId ?? config.model ?? GEMINI_DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`

  const styleImageParts = styleReferenceUrls?.length
    ? await fetchStyleImageParts(styleReferenceUrls)
    : []

  const { payload, finalPrompt } = buildGeminiPayload(
    isFirstTile,
    prompt,
    styleContext,
    contextImageBase64,
    styleImageParts
  )

  if (isFirstTile || !contextImageBase64) {
    logger.info('Generating first tile with style references')
  } else {
    logger.info('Generating follow-up tile with context image for edge matching')
  }

  logLLMRequestStart({
    provider: 'gemini',
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: payload,
    metadata: { isFirstTile, hasContextImage: !!contextImageBase64 },
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: payload,
      })
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = parseGeminiResponse(await response.json())
    return extractGeminiImageData(data, { model, prompt: finalPrompt, payload }, imagePart =>
      processGeminiImagePart(imagePart, isFirstTile, contextImageBase64)
    )
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Gemini API error')) {
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: error.message,
        input: payload,
      })
    }
    throw error
  }
}
