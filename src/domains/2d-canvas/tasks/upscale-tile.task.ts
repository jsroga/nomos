import { env } from '@/shared/config/env'
import { logger, metadata } from '@trigger.dev/sdk/v3'
import { JobQueue, MachinePreset, defineOwnedTask } from '@/shared/jobs'
import { put } from '@vercel/blob'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { BufferEncoding, ContentType } from '@/shared/data/constants/protocol'
import { UpscaleStrategy } from '../constants/generation-modes'
import { runModeUpscale } from './upscale-tile-mode-run'
import { upscaleTilePayloadSchema } from './constants/upscale-tile-payload'

export const upscaleTileTask = defineOwnedTask({
  id: 'upscale-tile',
  schema: upscaleTilePayloadSchema,
  queue: JobQueue.ImageProvider,
  // The one preset with a reason behind it: sharp holds a decoded upscale in
  // memory, and the default machine is not sized for it.
  machine: MachinePreset.Medium1x,
  maxDuration: 1200,
  retry: {
    maxAttempts: 1,
  },
  run: async payload => {
    const {
      tileId,
      projectId,
      imageBase64,
      prompt,
      creativity,
      provider,
      providerConfig,
      styleReferenceUrls,
      upscaleStrategy = UpscaleStrategy.Topaz,
      geminiConfig,
    } = payload

    logger.info(`Starting upscale for tile ${tileId}`, {
      provider,
      projectId,
      upscaleStrategy,
    })

    await metadata.set('progress', 0)
    await metadata.set('provider', provider)
    await metadata.set('tile_id', tileId)
    await metadata.set('stage', 'initializing')

    await metadata.set('stage', 'provider_upscale')
    const providerResult = await runModeUpscale({
      upscaleStrategy,
      providerConfig,
      imageBase64,
      prompt,
      creativity,
      styleReferenceUrls,
      geminiConfig,
    })

    await metadata.set('stage', 'uploading')

    const timestamp = Date.now()
    const upscaledFilename = `${tileId}_upscaled_${provider}_${timestamp}.png`
    const originalFilename = `original_${tileId}_${timestamp}.png`

    const imageData = await resolveUpscaledImageData(providerResult)

    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured')
    }

    const upscaledBuffer = Buffer.from(imageData, BufferEncoding.Base64)
    const upscaledBlob = await put(`upscales/${projectId}/${upscaledFilename}`, upscaledBuffer, {
      access: 'public',
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: ContentType.Png,
    })

    const originalData = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const originalBuffer = Buffer.from(originalData, BufferEncoding.Base64)
    let originalUrl: string
    try {
      const originalBlob = await put(`upscales/${projectId}/${originalFilename}`, originalBuffer, {
        access: 'public',
        token: env.BLOB_READ_WRITE_TOKEN,
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
