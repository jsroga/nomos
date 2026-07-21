import { logger, metadata } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { UPSCALE_PROMPTS, MASK_CONFIG } from '@/shared/data/server/prompts'
import {
  readRowString,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { pollLegNextTask } from './upscale-tile-legnext-poll'

export async function upscaleWithLegNext(
  imageBase64: string,
  _prompt: string,
  apiKey: string,
  mimeType: string = 'image/png',
  styleReferenceUrls?: string[],
  creativity: number = 0.3
): Promise<{ id: string; imageUrl: string }> {
  logger.info('Starting Midjourney upscale via LegNext AI (upload_paint)', {
    mimeType,
    styleReferenceUrls,
    creativity,
  })
  await metadata.set('stage', 'uploading_image')
  await metadata.set('progress', 32)

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `upscale_temp_${uuidv4()}.png`

  const publicImageUrl = await storageService.uploadPublicImage(tempFilename, imageBase64)

  if (!publicImageUrl) {
    throw new Error('Failed to upload image for upscaling. Midjourney requires a public URL.')
  }

  logger.info('Image uploaded to public URL', { publicImageUrl })

  logger.info('Submitting upload_paint task')
  await metadata.set('stage', 'submitting_upload_paint')
  await metadata.set('progress', 35)

  let remixPrompt: string = UPSCALE_PROMPTS.MIDJOURNEY

  if (styleReferenceUrls && styleReferenceUrls.length > 0) {
    remixPrompt += ` --sref ${styleReferenceUrls.join(' ')}`
  }

  const uploadPaintPayload = {
    imgUrl: publicImageUrl,
    canvas: {
      width: 1024,
      height: 1024,
    },
    imgPos: {
      width: 1024,
      height: 1024,
      x: 0,
      y: 0,
    },
    mask: {
      areas: [
        {
          width: MASK_CONFIG.FULL_CANVAS.width,
          height: MASK_CONFIG.FULL_CANVAS.height,
          points: MASK_CONFIG.FULL_CANVAS.points,
        },
      ],
    },
    remixPrompt,
  }

  logger.info('Submitting upload_paint with payload:', uploadPaintPayload)

  const uploadPaintResponse = await fetch('https://api.legnext.ai/api/v1/upload-paint', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(uploadPaintPayload),
  })

  if (!uploadPaintResponse.ok) {
    const errorText = await uploadPaintResponse.text()
    throw new Error(
      `LegNext upload_paint submission failed: ${uploadPaintResponse.status} - ${errorText}`
    )
  }

  const uploadPaintData = await uploadPaintResponse.json()
  const jobId = uploadPaintData.job_id

  if (!jobId) {
    throw new Error('LegNext upload_paint failed: No job_id returned')
  }

  await metadata.set('upload_paint_job_id', jobId)
  logger.info('Upload_paint task submitted', { jobId })

  await metadata.set('stage', 'waiting_upload_paint')
  await metadata.set('progress', 40)

  await pollLegNextTask(jobId, apiKey, 300, 40)

  logger.info('Upload_paint completed, submitting upscale', { jobId })

  await metadata.set('stage', 'submitting_upscale')
  await metadata.set('progress', 70)

  const upscalePayload = {
    jobId: jobId,
    imageNo: 0,
    type: 0,
  }

  logger.info('Submitting upscale with payload:', upscalePayload)

  const upscaleResponse = await fetch('https://api.legnext.ai/api/v1/upscale', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(upscalePayload),
  })

  if (!upscaleResponse.ok) {
    const errorText = await upscaleResponse.text()
    throw new Error(`LegNext upscale submission failed: ${upscaleResponse.status} - ${errorText}`)
  }

  const upscaleData = await upscaleResponse.json()
  const upscaleJobId = upscaleData.job_id

  if (!upscaleJobId) {
    throw new Error('LegNext upscale failed: No job_id returned')
  }

  await metadata.set('upscale_task_id', upscaleJobId)
  await metadata.set('stage', 'waiting_upscale')
  await metadata.set('progress', 75)

  logger.info('Waiting for upscale task', { upscaleJobId })
  const upscaleResult = await pollLegNextTask(upscaleJobId, apiKey, 300, 75)

  const upscaleOutput = recordFromJson(upscaleResult.output)
  const imageUrls = stringArrayFromJson(upscaleOutput.image_urls)
  const imageUrl = readRowString(upscaleOutput, 'image_url') ?? imageUrls[0]

  if (!imageUrl) {
    throw new Error('LegNext upscale result missing image_url')
  }

  return {
    id: upscaleJobId,
    imageUrl,
  }
}
