import { logger, metadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { storageService } from '@/shared/data/storage/storage-service'
import { UPSCALE_PROMPTS, MASK_CONFIG } from '@/shared/data/server/prompts'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  readRowString,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import {
  isReplicateModelId,
  parseReplicateImageOutput,
} from '@/shared/ai/replicate-output'

export type UpscaleProvider = 'midjourney' | 'replicate' | 'stability'

export interface ProviderConfig {
  apiKey: string
  model?: string
  upscaleMode?: 'conservative' | 'creative'
}

interface LegNextJobResponse {
  status?: string
  message?: string
  output?: {
    image_url?: string
    error_messages?: string[]
  }
}

function readLegNextJobResponse(value: unknown): LegNextJobResponse {
  const record = recordFromJson(value)
  const output = recordFromJson(record.output)
  return {
    status: readRowString(record, 'status'),
    message: readRowString(record, 'message'),
    output: {
      image_url: readRowString(output, 'image_url'),
      error_messages: stringArrayFromJson(output.error_messages),
    },
  }
}

function estimateLegNextProgress(status: string | undefined, attempts: number): number {
  if (status === 'completed') return 100
  if (status === 'processing') return 50 + (attempts % 40)
  if (status === 'pending') return 10
  return 0
}

async function handleLegNextPollResponse(
  raw: unknown,
  jobId: string,
  attempts: number,
  progressOffset: number
): Promise<Record<string, unknown> | null> {
  const data = readLegNextJobResponse(raw)
  const status = data.status
  const progress = estimateLegNextProgress(status, attempts)
  const scaledProgress = progressOffset + Math.round(progress * 0.65)

  await metadata.set('progress', scaledProgress)
  logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

  if (status === 'completed') {
    logger.info('LegNext task completed successfully', {
      imageUrl: data.output?.image_url,
    })
    await metadata.set('progress', progressOffset + 65)
    return recordFromJson(raw)
  }

  if (status === 'failed') {
    const errorMsg =
      data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
    logger.error('LegNext task failed', { error: errorMsg, fullData: data })
    throw new AbortTaskRunError(errorMsg)
  }

  return null
}

export async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30
): Promise<Record<string, unknown>> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      })

      if (fetchResponse.status === 404) {
        throw new AbortTaskRunError('Task not found')
      }

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText} `)
        attempts++
        continue
      }

      const raw = await fetchResponse.json()
      const completed = await handleLegNextPollResponse(raw, jobId, attempts, progressOffset)
      if (completed) return completed
    } catch (e: unknown) {
      if (e instanceof AbortTaskRunError) throw e
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
    }

    attempts++
  }

  throw new AbortTaskRunError('Task timeout - Status did not reach completed')
}

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

export async function upscaleWithReplicate(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string
): Promise<{ type: 'url' | 'base64'; data: string }> {
  logger.info('Starting Replicate upscale', { model })
  await metadata.set('stage', 'replicate_processing')

  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: apiKey })

  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `replicate_input_${uuidv4()}.png`
  const inputImageUrl = await storageService.uploadPublicImage(
    tempFilename,
    imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`
  )

  if (!inputImageUrl) {
    throw new Error('Failed to upload input image for Replicate')
  }

  logger.info('Input image uploaded for Replicate', { inputImageUrl })

  if (!isReplicateModelId(model)) {
    throw new Error(`Invalid Replicate model id: ${model}`)
  }
  const output: unknown = await replicate.run(model, {
    input: {
      image: inputImageUrl,
      prompt,
    },
  })

  logger.info('Replicate raw output:', {
    type: typeof output,
    isArray: Array.isArray(output),
    keys: typeof output === 'object' && output ? Object.keys(output) : [],
    stringified: JSON.stringify(output).substring(0, 500),
  })

  await metadata.set('progress', 100)

  return parseReplicateImageOutput(output)
}

async function upscaleWithStabilityConservative(
  upscaleUrl: string,
  formData: FormData,
  apiKey: string
): Promise<string> {
  const axios = (await import('axios')).default
  const response = await axios.post(upscaleUrl, formData, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'image/*',
    },
    responseType: 'arraybuffer',
    validateStatus: () => true,
  })

  if (response.status !== 200) {
    const errorText = new TextDecoder().decode(response.data)
    throw new Error(`Stability API error (${response.status}): ${errorText}`)
  }

  await metadata.set('progress', 100)
  return btoa(
    new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )
}

async function pollStabilityCreativeResult(
  resultUrl: string,
  apiKey: string,
  maxAttempts: number
): Promise<string> {
  const axios = (await import('axios')).default

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    await metadata.set('progress', Math.min(90, (attempt / maxAttempts) * 100))

    const resultResponse = await axios.get(resultUrl, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: '*/*',
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
    })

    if (resultResponse.status === 200) {
      logger.info('Stability creative upscale complete!')
      await metadata.set('progress', 100)
      return btoa(
        new Uint8Array(resultResponse.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )
    }

    if (resultResponse.status === 202) {
      logger.info(`Stability still processing (attempt ${attempt + 1}/${maxAttempts})`)
      continue
    }

    const errorText = new TextDecoder().decode(resultResponse.data)
    throw new Error(`Stability result fetch error (${resultResponse.status}): ${errorText}`)
  }

  throw new Error('Stability upscale timeout')
}

export async function upscaleWithStability(
  imageBase64: string,
  apiKey: string,
  mode: 'conservative' | 'creative' = 'conservative'
): Promise<string> {
  logger.info('Starting Stability AI upscale', { mode })
  await metadata.set('stage', 'stability_processing')

  const axios = (await import('axios')).default
  const upscaleUrl = `https://api.stability.ai/v2beta/stable-image/upscale/${mode}`

  const byteCharacters = atob(imageBase64.replace(/^data:image\/\w+;base64,/, ''))
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/png' })

  const formData = new FormData()
  formData.append('image', blob, 'input.png')
  formData.append('prompt', UPSCALE_PROMPTS.STABILITY)
  formData.append('output_format', 'png')

  if (mode === 'conservative') {
    return upscaleWithStabilityConservative(upscaleUrl, formData, apiKey)
  }

  const submitResponse = await axios.post(upscaleUrl, formData, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
    },
    validateStatus: () => true,
  })

  if (submitResponse.status !== 200) {
    throw new Error(
      `Stability API error (${submitResponse.status}): ${submitResponse.data?.message}`
    )
  }

  const generationId = submitResponse.data?.id
  if (!generationId) {
    throw new Error('No generation ID returned from Stability API')
  }

  logger.info('Stability generation ID', { generationId })
  await metadata.set('generation_id', generationId)

  const resultUrl = `https://api.stability.ai/v2beta/results/${generationId}`
  return pollStabilityCreativeResult(resultUrl, apiKey, 60)
}
