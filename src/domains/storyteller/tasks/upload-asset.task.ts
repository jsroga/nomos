import { env } from '@/shared/config/env'
import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { promises as fs } from 'fs'
import { join } from 'path'

export const uploadAssetTask = task({
  id: 'upload-asset',
  maxDuration: 600, // 10 minutes
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    projectId: string
    assetId: string
    modelFilename: string // e.g., "asset_123.glb"
  }) => {
    const { projectId, assetId, modelFilename } = payload

    logger.info(`Starting asset upload for ${assetId}`, { modelFilename })

    await metadata.set('progress', 5)
    await metadata.set('stage', 'reading_file')

    // Step 1: Read the model file from local filesystem
    const filePath = join(process.cwd(), 'public', 'projects', projectId, 'assets', modelFilename)

    logger.info('Reading file from:', { filePath })

    let fileBuffer: Buffer
    try {
      fileBuffer = await fs.readFile(filePath)
    } catch (err) {
      throw new Error(`Failed to read model file: ${err}`)
    }

    logger.info('File read successfully', { size: fileBuffer.byteLength })
    await metadata.set('progress', 20)

    // Step 2: Upload to Vercel Blob
    await metadata.set('stage', 'uploading_to_vercel')

    const blobFilename = `assets/${projectId}/${modelFilename}`

    logger.info('Uploading to Vercel Blob', { blobFilename, size: fileBuffer.byteLength })

    let blobUrl: string
    try {
      const blob = await put(blobFilename, fileBuffer, {
        access: 'public',
        token: env.BLOB_READ_WRITE_TOKEN,
        contentType: modelFilename.endsWith('.glb')
          ? 'model/gltf-binary'
          : modelFilename.endsWith('.gltf')
            ? 'model/gltf+json'
            : 'application/octet-stream',
        multipart: false,
      })

      blobUrl = blob.url
      logger.info('Upload successful', { url: blobUrl })
    } catch (err) {
      logger.error('Vercel Blob upload failed', { error: err })
      throw new Error(`Failed to upload to Vercel Blob: ${err}`)
    }

    await metadata.set('progress', 80)

    // Step 3: Update database with the Vercel Blob URL
    await metadata.set('stage', 'updating_database')

    const supabase = createSupabaseServiceClient()

    const { error } = await supabase
      .from('assets')
      .update({
        model_filename: blobUrl, // Store Vercel Blob URL instead of local path
      })
      .eq('id', assetId)

    if (error) {
      logger.error('Failed to update asset in database', { error })
      throw new Error(`Database update failed: ${error.message}`)
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    logger.info('Asset upload completed successfully', { assetId, blobUrl })

    return {
      success: true,
      blobUrl,
    }
  },
})
