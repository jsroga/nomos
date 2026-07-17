import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { runGeminiPreUpscaleStep } from './upscale-tile-gemini-step'
import {
  upscaleWithLegNext,
  upscaleWithReplicate,
  upscaleWithStability,
  type ProviderConfig,
  type UpscaleProvider,
} from './upscale-tile-providers'

export const upscaleTileTask = task({
  id: 'upscale-tile',
  machine: 'medium-1x',
  maxDuration: 1200,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    tileId: string
    projectId: string
    imageBase64: string
    prompt: string
    creativity: number
    provider: UpscaleProvider
    providerConfig: ProviderConfig
    geminiConfig?: {
      apiKey: string
      model?: string
    }
    skipGeminiPreUpscale?: boolean
    styleReferenceUrls?: string[]
  }) => {
    const {
      tileId,
      projectId,
      imageBase64,
      prompt,
      creativity,
      provider,
      providerConfig,
      geminiConfig,
      skipGeminiPreUpscale,
      styleReferenceUrls,
    } = payload

    logger.info(`Starting upscale for tile ${tileId}`, {
      provider,
      projectId,
      skipGeminiPreUpscale,
    })

    await metadata.set('progress', 0)
    await metadata.set('provider', provider)
    await metadata.set('tile_id', tileId)
    await metadata.set('stage', 'initializing')

    let step1Image = imageBase64
    let step1MimeType = 'image/png'

    if (!skipGeminiPreUpscale && geminiConfig?.apiKey) {
      const geminiResult = await runGeminiPreUpscaleStep({
        imageBase64,
        prompt,
        creativity,
        geminiConfig,
        styleReferenceUrls,
      })
      step1Image = geminiResult.step1Image
      step1MimeType = geminiResult.step1MimeType
    } else {
      logger.info('Skipping Gemini pre-upscale')
      await metadata.set('progress', 10)
    }

    await metadata.set('stage', 'provider_upscale')
    const providerResult = await runProviderUpscale({
      provider,
      providerConfig,
      step1Image,
      step1MimeType,
      prompt,
      creativity,
      styleReferenceUrls,
    })

    await metadata.set('stage', 'uploading')

    const timestamp = Date.now()
    const upscaledFilename = `${tileId}_upscaled_${provider}_${timestamp}.png`
    const originalFilename = `original_${tileId}_${timestamp}.png`

    const imageData = await resolveUpscaledImageData(providerResult)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured')
    }

    const upscaledBuffer = Buffer.from(imageData, 'base64')
    const upscaledBlob = await put(`upscales/${projectId}/${upscaledFilename}`, upscaledBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    const originalData = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const originalBuffer = Buffer.from(originalData, 'base64')
    let originalUrl: string
    try {
      const originalBlob = await put(`upscales/${projectId}/${originalFilename}`, originalBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'image/png',
      })
      originalUrl = originalBlob.url
    } catch (e) {
      logger.warn('Failed to upload original image:', { error: getErrorMessage(e) })
      originalUrl = ''
    }

    const upscaledUrl = upscaledBlob.url

    logger.info('Images uploaded to Vercel Blob', { upscaledUrl, originalUrl })

    await metadata.set('stage', 'pending_review')
    await metadata.set('progress', 100)

    logger.info('Upscale completed - pending user review', { upscaledFilename, provider })

    return {
      success: true,
      filename: upscaledFilename,
      upscaledUrl,
      originalUrl,
      provider,
      pendingReview: true,
    }
  },
})

interface ProviderUpscaleResult {
  finalImageUrl: string | null
  finalImageBase64: string | null
}

async function runProviderUpscale(params: {
  provider: UpscaleProvider
  providerConfig: ProviderConfig
  step1Image: string
  step1MimeType: string
  prompt: string
  creativity: number
  styleReferenceUrls?: string[]
}): Promise<ProviderUpscaleResult> {
  const {
    provider,
    providerConfig,
    step1Image,
    step1MimeType,
    prompt,
    creativity,
    styleReferenceUrls,
  } = params

  switch (provider) {
    case 'midjourney': {
      const sharp = (await import('sharp')).default
      const buffer = Buffer.from(step1Image, 'base64')
      const meta = await sharp(buffer).metadata()

      let resizedImage = step1Image
      if (meta.width && meta.width > 512) {
        logger.info('Downsizing image for MJ (compatibility)', { originalWidth: meta.width })
        const resizedBuffer = await sharp(buffer)
          .resize(512, 512, { fit: 'fill' })
          .toBuffer()
        resizedImage = resizedBuffer.toString('base64')
      }

      const legNextResult = await upscaleWithLegNext(
        resizedImage,
        prompt,
        providerConfig.apiKey,
        step1MimeType,
        styleReferenceUrls,
        creativity
      )

      logger.info('Midjourney upscale via LegNext completed', {
        finalImageUrl: legNextResult.imageUrl,
      })

      return { finalImageUrl: legNextResult.imageUrl, finalImageBase64: null }
    }

    case 'replicate': {
      if (!providerConfig.model) {
        throw new Error('Replicate model is required')
      }
      const replicateResult = await upscaleWithReplicate(
        step1Image,
        prompt,
        providerConfig.apiKey,
        providerConfig.model
      )
      if (replicateResult.type === 'url') {
        return { finalImageUrl: replicateResult.data, finalImageBase64: null }
      }
      return { finalImageUrl: null, finalImageBase64: replicateResult.data }
    }

    case 'stability': {
      const base64 = await upscaleWithStability(
        step1Image,
        providerConfig.apiKey,
        providerConfig.upscaleMode || 'conservative'
      )
      return { finalImageUrl: null, finalImageBase64: base64 }
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

async function resolveUpscaledImageData(result: ProviderUpscaleResult): Promise<string> {
  if (result.finalImageUrl) {
    const response = await fetch(result.finalImageUrl)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  }

  if (result.finalImageBase64) {
    return result.finalImageBase64.replace(/^data:image\/\w+;base64,/, '')
  }

  throw new Error('No image data to save')
}
