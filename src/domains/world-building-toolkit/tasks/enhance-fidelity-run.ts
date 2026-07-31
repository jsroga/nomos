import { logger, metadata } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { FIDELITY_PROMPTS, getCreativityPrompt } from '@/shared/data/server/prompts'
import {
  logLLMRequestStart,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import {
  BufferEncoding,
  BlobAccess,
  ContentType,
  GoogleModelId,
  HttpMethod,
} from '@/shared/data/constants/protocol'
import { GeminiResponseModality } from '@/shared/data/constants/repaint-gemini'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import {
  parseGeminiResponse,
  readGeminiImageData,
} from './constants/generate-tile-json-guards'
import { extractGeminiImageData } from './constants/generate-tile-gemini-response'
import { createSupabaseServiceClient } from './constants/generate-tile-persist'

export interface EnhanceFidelityPayload {
  tileId: string
  projectId: string
  imageBase64: string
  stylePrompt: string
  creativity: number
  geminiConfig: {
    apiKey: string
    model?: string
  }
  styleReferenceUrls?: string[]
}

export async function runEnhanceFidelity(payload: EnhanceFidelityPayload) {
  const {
    tileId,
    projectId,
    imageBase64,
    stylePrompt,
    creativity,
    geminiConfig,
    styleReferenceUrls,
  } = payload

  logger.info(`Starting fidelity enhancement for tile ${tileId}`, { projectId })

  await metadata.set('progress', 0)
  await metadata.set('stage', 'initializing')
  await metadata.set('tile_id', tileId)

  await metadata.set('stage', 'enhancing')
  await metadata.set('progress', 30)

  const model = geminiConfig.model || GoogleModelId.Gemini3ProImagePreview
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.apiKey}`

  const styleRefHint = styleReferenceUrls?.length
    ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
    : ''

  const creativityPrompt = getCreativityPrompt(creativity || 0.3)
  const finalPrompt = FIDELITY_PROMPTS.GEMINI(stylePrompt, creativityPrompt, styleRefHint)

  const geminiPayload = {
    contents: [
      {
        parts: [
          { text: finalPrompt },
          {
            inline_data: {
              mime_type: ContentType.Png,
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: [GeminiResponseModality.Text, GeminiResponseModality.Image],
    },
  }

  logger.info('Calling Gemini API for fidelity enhancement', {
    model,
    promptLength: finalPrompt.length,
  })

  logLLMRequestStart({
    provider: ImageGenProvider.Gemini,
    model,
    prompt: finalPrompt,
    inputImageUrls: ['[Input Image Base64]'],
    input: geminiPayload,
    metadata: {
      task: 'fidelity-enhancement',
      creativity,
    },
  })

  const response = await fetch(url, {
    method: HttpMethod.Post,
    headers: { 'Content-Type': ContentType.Json },
    body: JSON.stringify(geminiPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Gemini API error', { status: response.status, errorText })
    logLLMRequestError({
      provider: ImageGenProvider.Gemini,
      model,
      prompt: finalPrompt,
      error: `HTTP ${response.status}: ${errorText}`,
      input: geminiPayload,
    })
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const geminiResponse = parseGeminiResponse(data)
  const logContext = { model, prompt: finalPrompt, payload: geminiPayload }

  const enhancedImageBase64 = await extractGeminiImageData(
    geminiResponse,
    logContext,
    async imagePart => {
      const imageData = readGeminiImageData(imagePart)
      if (!imageData) {
        throw new Error('No image found in Gemini response')
      }
      return imageData
    }
  )

  logger.info('Gemini fidelity enhancement completed', {
    imageLength: enhancedImageBase64.length,
  })

  await metadata.set('progress', 70)
  await metadata.set('stage', 'uploading')

  const timestamp = Date.now()
  const filename = `fidelity/${projectId}/${tileId}_enhanced_${timestamp}.png`

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured')
  }

  const buffer = Buffer.from(enhancedImageBase64, BufferEncoding.Base64)
  const blob = await put(filename, buffer, {
    access: BlobAccess.Public,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: ContentType.Png,
  })

  const enhancedUrl = blob.url
  logger.info('Enhanced image uploaded to Vercel Blob', { enhancedUrl })

  const supabase = createSupabaseServiceClient()

  await metadata.set('progress', 90)
  await metadata.set('stage', 'pending_review')

  const { data: tile } = await supabase
    .from('tiles')
    .select('image_filename')
    .eq('id', tileId)
    .single()

  let originalUrl = ''
  if (tile?.image_filename) {
    originalUrl = tile.image_filename.startsWith('http')
      ? tile.image_filename
      : `/projects/${projectId}/${tile.image_filename}`
  }

  await metadata.set('progress', 100)
  await metadata.set('stage', 'completed')

  logger.info('Fidelity enhancement completed - pending user review', { filename })

  return {
    success: true,
    filename,
    enhancedUrl,
    enhancedBase64: enhancedImageBase64,
    originalUrl,
    pendingReview: true,
  }
}
