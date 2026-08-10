import { logger, metadata } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { FIDELITY_PROMPTS, getCreativityPrompt } from '@/shared/data/server/prompts'
import { REPAINT_STYLE_REF_PREFIX } from '@/shared/data/constants/repaint-gemini'
import {
  logLLMRequestStart,
  logLLMRequestError,
} from '@/trigger/utils/llm-logger'
import {
  BufferEncoding,
  BlobAccess,
  ContentType,
  StringSeparator,
  UrlScheme,
} from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'
import { resolveFidelityModel } from '@/shared/ai/image-model-env'
import { storageService } from '@/shared/data/storage/storage-service'
import { createSupabaseServiceClient } from './constants/generate-tile-persist'

export interface EnhanceFidelityPayload {
  tileId: string
  projectId: string
  imageBase64: string
  stylePrompt: string
  creativity: number
  apiframeConfig: {
    apiKey: string
    model?: string
  }
  styleReferenceUrls?: string[]
}

function toDataUrl(base64: string): string {
  if (base64.startsWith(UrlScheme.Data)) return base64
  return `${UrlScheme.Data}${ContentType.Png};${BufferEncoding.Base64},${base64}`
}

export async function runEnhanceFidelity(payload: EnhanceFidelityPayload) {
  const {
    tileId,
    projectId,
    imageBase64,
    stylePrompt,
    creativity,
    apiframeConfig,
    styleReferenceUrls,
  } = payload

  logger.info(`Starting fidelity enhancement for tile ${tileId}`, { projectId })

  await metadata.set('progress', 0)
  await metadata.set('stage', 'initializing')
  await metadata.set('tile_id', tileId)

  await metadata.set('stage', 'enhancing')
  await metadata.set('progress', 30)

  const styleRefHint = styleReferenceUrls?.length
    ? `${REPAINT_STYLE_REF_PREFIX}${styleReferenceUrls.join(StringSeparator.CommaSpace)}.`
    : ''

  const creativityPrompt = getCreativityPrompt(creativity || 0.3)
  const finalPrompt = FIDELITY_PROMPTS.GEMINI(stylePrompt, creativityPrompt, styleRefHint)
  const model = apiframeConfig.model || resolveFidelityModel()

  const { v4: uuidv4 } = await import('uuid')
  const publicImageUrl = await storageService.uploadPublicImage(
    `fidelity_input_${uuidv4()}.png`,
    toDataUrl(imageBase64),
  )
  if (!publicImageUrl) {
    throw new Error('Failed to upload image for fidelity enhancement')
  }

  logger.info('Calling Apiframe Nano Banana for fidelity enhancement', {
    model,
    promptLength: finalPrompt.length,
  })

  logLLMRequestStart({
    provider: ImageGenProvider.Apiframe,
    model,
    prompt: finalPrompt,
    inputImageUrls: [publicImageUrl],
    input: { model, prompt: finalPrompt, image_input: [publicImageUrl] },
    metadata: {
      task: 'fidelity-enhancement',
      creativity,
    },
  })

  let enhancedImageBase64: string
  try {
    enhancedImageBase64 = await generateNanoBananaBase64({
      prompt: finalPrompt,
      apiKey: apiframeConfig.apiKey,
      modelId: model,
      imageInputUrls: [publicImageUrl],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logLLMRequestError({
      provider: ImageGenProvider.Apiframe,
      model,
      prompt: finalPrompt,
      error: message,
      input: { model, prompt: finalPrompt, image_input: [publicImageUrl] },
    })
    throw error
  }

  logger.info('Apiframe fidelity enhancement completed', {
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
