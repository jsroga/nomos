import { logger } from '@trigger.dev/sdk/v3'
import { GENERATION_PROMPTS, tilePromptLayersFrom } from '@/shared/data/server/prompts'
import {
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { BufferEncoding, ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  GEMINI_DEFAULT_MODEL,
} from './generate-tile'
import { toTilePngBase64 } from './generate-tile-output'
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
      const base64 = Buffer.from(arrayBuffer).toString(BufferEncoding.Base64)
      const contentType = resp.headers.get('content-type') ?? ContentType.Png
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
  styleImageParts: GeminiInlineDataPart[],
  masterPrompt?: string,
  modePromptFragment?: string,
): { payload: GeminiRequestPayload; finalPrompt: string } {
  const layers = tilePromptLayersFrom({
    prompt,
    masterPrompt,
    modePromptFragment,
    styleContext,
  })
  if (isFirstTile || !contextImageBase64) {
    const finalPrompt = GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)
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

  const finalPrompt = GENERATION_PROMPTS.FOLLOW_UP.MASTER(layers)
  return {
    finalPrompt,
    payload: {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            { inline_data: { mime_type: ContentType.Png, data: contextImageBase64 } },
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

async function processGeminiImagePart(
  imagePart: GeminiContentPart,
  isFirstTile: boolean,
  contextImageBase64: string | undefined
): Promise<string> {
  const rawData = readGeminiImageData(imagePart)
  if (!rawData) {
    throw new Error('Gemini image part missing inline data')
  }
  return toTilePngBase64(rawData, isFirstTile || !contextImageBase64)
}

export async function generateWithGemini(
  prompt: string,
  config: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string,
  styleContext?: string,
  masterPrompt?: string,
  modePromptFragment?: string,
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
    styleImageParts,
    masterPrompt,
    modePromptFragment,
  )

  if (isFirstTile || !contextImageBase64) {
    logger.info('Generating first tile with style references')
  } else {
    logger.info('Generating follow-up tile with context image for edge matching')
  }

  logLLMRequestStart({
    provider: ImageGenProvider.Gemini,
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: payload,
    metadata: { isFirstTile, hasContextImage: !!contextImageBase64 },
  })

  try {
    const response = await fetch(url, {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: ImageGenProvider.Gemini,
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
        provider: ImageGenProvider.Gemini,
        model,
        prompt: finalPrompt,
        error: error.message,
        input: payload,
      })
    }
    throw error
  }
}
