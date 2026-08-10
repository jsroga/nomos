import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import { ApiframeUpscaleModel } from '@/shared/ai/constants/apiframe'
import { UpscaleProvider } from '../core/upscale-provider-wire'
import {
  upscaleWithApiframe,
  upscaleWithLegNext,
  type ProviderConfig,
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
      styleReferenceUrls,
    } = payload

    logger.info(`Starting upscale for tile ${tileId}`, {
      provider,
      projectId,
    })

    await metadata.set('progress', 0)
    await metadata.set('provider', provider)
    await metadata.set('tile_id', tileId)
    await metadata.set('stage', 'initializing')

    await metadata.set('stage', 'provider_upscale')
    const providerResult = await runProviderUpscale({
      provider,
      providerConfig,
      step1Image: imageBase64,
      step1MimeType: ContentType.Png,
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

    const upscaledBuffer = Buffer.from(imageData, BufferEncoding.Base64)
    const upscaledBlob = await put(`upscales/${projectId}/${upscaledFilename}`, upscaledBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: ContentType.Png,
    })

    const originalData = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const originalBuffer = Buffer.from(originalData, BufferEncoding.Base64)
    let originalUrl: string
    try {
      const originalBlob = await put(`upscales/${projectId}/${originalFilename}`, originalBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: ContentType.Png,
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
    case UpscaleProvider.Midjourney: {
      const sharp = (await import('sharp')).default
      const buffer = Buffer.from(step1Image, BufferEncoding.Base64)
      const meta = await sharp(buffer).metadata()

      let resizedImage = step1Image
      if (meta.width && meta.width > 512) {
        logger.info('Downsizing image for MJ (compatibility)', { originalWidth: meta.width })
        const resizedBuffer = await sharp(buffer)
          .resize(512, 512, { fit: 'fill' })
          .toBuffer()
        resizedImage = resizedBuffer.toString(BufferEncoding.Base64)
      }

      const mjResult = await upscaleWithLegNext(
        resizedImage,
        prompt,
        providerConfig.apiKey,
        step1MimeType,
        styleReferenceUrls,
        creativity,
      )

      logger.info('Midjourney upscale via Apiframe completed', {
        finalImageUrl: mjResult.imageUrl,
      })

      return { finalImageUrl: mjResult.imageUrl, finalImageBase64: null }
    }

    case UpscaleProvider.Replicate: {
      const result = await upscaleWithApiframe(
        step1Image,
        prompt,
        providerConfig.apiKey,
        ApiframeUpscaleModel.ClarityUpscale,
        step1MimeType,
      )
      return { finalImageUrl: result.imageUrl, finalImageBase64: null }
    }

    case UpscaleProvider.Stability:
    default: {
      const result = await upscaleWithApiframe(
        step1Image,
        prompt,
        providerConfig.apiKey,
        ApiframeUpscaleModel.TopazImageUpscale,
        step1MimeType,
      )
      return { finalImageUrl: result.imageUrl, finalImageBase64: null }
    }
  }
}

async function resolveUpscaledImageData(providerResult: ProviderUpscaleResult): Promise<string> {
  if (providerResult.finalImageBase64) {
    return providerResult.finalImageBase64.replace(/^data:image\/\w+;base64,/, '')
  }
  if (!providerResult.finalImageUrl) {
    throw new Error('Upscale provider returned no image')
  }
  const response = await fetch(providerResult.finalImageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download upscaled image: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer()).toString(BufferEncoding.Base64)
}
