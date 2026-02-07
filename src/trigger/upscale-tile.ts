import { task, logger, metadata, AbortTaskRunError } from '@trigger.dev/sdk/v3'
import { put } from '@vercel/blob'
import { storageService } from '@/infrastructure/storage/StorageService'
import { UPSCALE_PROMPTS, MASK_CONFIG, getCreativityPrompt } from '@/lib/server/prompts'

// Provider types
type UpscaleProvider = 'midjourney' | 'replicate' | 'stability'

interface ProviderConfig {
  apiKey: string
  model?: string
  upscaleMode?: 'conservative' | 'creative'
}

// LegNext polling
async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30
): Promise<any> {
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

      const data = await fetchResponse.json()
      const status = data.status

      // Progress estimation (LegNext doesn't seem to return numeric progress, so we simulate)
      let progress = 0
      if (status === 'completed') progress = 100
      else if (status === 'processing') progress = 50 + (attempts % 40)
      else if (status === 'pending') progress = 10

      const scaledProgress = progressOffset + Math.round(progress * 0.65)
      await metadata.set('progress', scaledProgress)

      logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

      if (status === 'completed') {
        logger.info('LegNext task completed successfully', {
          imageUrl: data.output?.image_url,
        })
        await metadata.set('progress', progressOffset + 65)
        return data
      } else if (status === 'failed') {
        const errorMsg = data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
        logger.error('LegNext task failed', { error: errorMsg, fullData: data })
        throw new AbortTaskRunError(errorMsg)
      }
    } catch (e: any) {
      if (e instanceof AbortTaskRunError) throw e
      logger.warn('Polling fetch error:', { error: e.message })
    }

    attempts++
  }

  throw new AbortTaskRunError('Task timeout - Status did not reach completed')
}

// NOTE: getCreativityPrompt is now imported from @/constants/prompts

// Midjourney upscale via PiAPI - uses imagine + upscale workflow
// Midjourney upscale via LegNext AI - uses upload_paint + upscale workflow
async function upscaleWithLegNext(
  imageBase64: string,
  prompt: string,
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

  // Step 1: Upload image to get a public URL
  const { v4: uuidv4 } = await import('uuid')
  const tempFilename = `upscale_temp_${uuidv4()}.png`

  const publicImageUrl = await storageService.uploadPublicImage(tempFilename, imageBase64)

  if (!publicImageUrl) {
    throw new Error('Failed to upload image for upscaling. Midjourney requires a public URL.')
  }

  logger.info('Image uploaded to public URL', { publicImageUrl })

  // Step 2: Submit upload_paint task to get job_id
  // For upscaling, we don't need remix/mask, just upload the image
  logger.info('Submitting upload_paint task')
  await metadata.set('stage', 'submitting_upload_paint')
  await metadata.set('progress', 35)

  // For upscaling, we need to provide canvas/mask even though we're not actually editing
  // Use standard tile size of 1024x1024

  // Build remixPrompt - Midjourney-specific prompt for structure-preserving upscale
  // CRITICAL: We must preserve exact structure/composition, only enhance quality
  // --stylize 0 prevents MJ from adding artistic interpretation
  // --q 2 ensures maximum quality output
  let remixPrompt = UPSCALE_PROMPTS.MIDJOURNEY

  // Add Style Reference if provided (--sref url1 url2)
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

  // Step 3: Poll for upload_paint completion
  await metadata.set('stage', 'waiting_upload_paint')
  await metadata.set('progress', 40)

  const uploadPaintResult = await pollLegNextTask(jobId, apiKey, 300, 40)

  logger.info('Upload_paint completed, submitting upscale', { jobId })

  // Step 4: Submit upscale for first variant (index 0)
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

  // Step 5: Poll for upscale completion
  logger.info('Waiting for upscale task', { upscaleJobId })
  const upscaleResult = await pollLegNextTask(upscaleJobId, apiKey, 300, 75)

  const imageUrl = upscaleResult.output?.image_url || upscaleResult.output?.image_urls?.[0]

  if (!imageUrl) {
    throw new Error('LegNext upscale result missing image_url')
  }

  return {
    id: upscaleJobId,
    imageUrl,
  }
}

// Replicate upscale - returns URL or base64 image data
async function upscaleWithReplicate(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string
): Promise<{ type: 'url' | 'base64'; data: string }> {
  logger.info('Starting Replicate upscale', { model })
  await metadata.set('stage', 'replicate_processing')

  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: apiKey })

  // First upload the image to get a URL that Replicate can access
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

  // Use the URL instead of base64 - more reliable
  const output = (await replicate.run(model as `${string}/${string}`, {
    input: {
      image: inputImageUrl,
      prompt,
    },
  })) as any

  logger.info('Replicate raw output:', {
    type: typeof output,
    isArray: Array.isArray(output),
    constructor: output?.constructor?.name,
    keys: typeof output === 'object' && output ? Object.keys(output) : [],
    stringified: JSON.stringify(output).substring(0, 500),
  })

  await metadata.set('progress', 100)

  // Replicate returns different formats depending on the model
  // Could be: URL string, array of URLs, FileOutput object, or ReadableStream

  // Handle string output (URL or base64)
  if (typeof output === 'string') {
    if (output.startsWith('http')) {
      return { type: 'url', data: output }
    } else if (output.startsWith('data:')) {
      return { type: 'base64', data: output.replace(/^data:image\/\w+;base64,/, '') }
    } else {
      // Assume it's raw base64
      return { type: 'base64', data: output }
    }
  }

  // Handle array output (common for image models)
  if (Array.isArray(output) && output.length > 0) {
    const firstOutput = output[0]
    if (typeof firstOutput === 'string' && firstOutput.startsWith('http')) {
      return { type: 'url', data: firstOutput }
    }
    // Some models return FileOutput objects in array
    if (firstOutput && typeof firstOutput === 'object') {
      const url = (firstOutput as any).url || (firstOutput as any).href
      if (url && typeof url === 'string') {
        return { type: 'url', data: url }
      }
    }
  }

  // Handle object output (FileOutput or similar)
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    // Check for common URL properties
    const possibleUrl =
      (output as any).url || (output as any).href || (output as any).uri || (output as any).output
    if (possibleUrl && typeof possibleUrl === 'string' && possibleUrl.startsWith('http')) {
      return { type: 'url', data: possibleUrl }
    }

    // Some models return { output: "url" } or { image: "url" }
    const possibleImage = (output as any).image
    if (possibleImage && typeof possibleImage === 'string' && possibleImage.startsWith('http')) {
      return { type: 'url', data: possibleImage }
    }

    // Handle ReadableStream (some newer models)
    if (typeof (output as any).getReader === 'function') {
      logger.info('Output is a ReadableStream, reading...')
      const reader = (output as ReadableStream).getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const combined = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      return { type: 'base64', data: Buffer.from(combined).toString('base64') }
    }
  }

  throw new Error(`Unexpected Replicate output format: ${JSON.stringify(output).substring(0, 500)}`)
}

// Stability AI upscale
async function upscaleWithStability(
  imageBase64: string,
  apiKey: string,
  mode: 'conservative' | 'creative' = 'conservative'
): Promise<string> {
  logger.info('Starting Stability AI upscale', { mode })
  await metadata.set('stage', 'stability_processing')

  const axios = (await import('axios')).default
  const upscaleUrl = `https://api.stability.ai/v2beta/stable-image/upscale/${mode}`

  // Convert base64 to blob
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
    // Conservative mode: synchronous
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
    const base64 = btoa(
      new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    return base64
  } else {
    // Creative mode: asynchronous
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

    // Poll for result
    const resultUrl = `https://api.stability.ai/v2beta/results/${generationId}`
    const maxAttempts = 60

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
        const base64 = btoa(
          new Uint8Array(resultResponse.data).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        )
        return base64
      } else if (resultResponse.status === 202) {
        logger.info(`Stability still processing (attempt ${attempt + 1}/${maxAttempts})`)
        continue
      } else {
        const errorText = new TextDecoder().decode(resultResponse.data)
        throw new Error(`Stability result fetch error (${resultResponse.status}): ${errorText}`)
      }
    }

    throw new Error('Stability upscale timeout')
  }
}

// Main upscale task
export const upscaleTileTask = task({
  id: 'upscale-tile',
  machine: 'medium-1x', // More memory for image processing
  maxDuration: 1200, // 20 minutes
  retry: {
    maxAttempts: 1, // Don't retry - costs money
  },
  run: async (payload: {
    tileId: string
    projectId: string
    imageBase64: string
    prompt: string
    creativity: number
    provider: UpscaleProvider
    providerConfig: ProviderConfig
    // Optional: Step 1 Gemini config for initial upscale
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

    // Step 1: Optionally upscale with Gemini first
    if (!skipGeminiPreUpscale && geminiConfig?.apiKey) {
      logger.info('Step 1: Upscaling with Gemini')
      await metadata.set('stage', 'gemini_upscale')

      const model = geminiConfig.model || 'gemini-3-pro-image-preview'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.apiKey}`

      // Build style reference hint
      const styleRefHint = styleReferenceUrls?.length
        ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
        : ''
      const creativityPrompt = getCreativityPrompt(creativity)
      const finalPrompt = UPSCALE_PROMPTS.GEMINI_STEP1(prompt, creativityPrompt, styleRefHint)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: finalPrompt },
                {
                  inline_data: {
                    mime_type: 'image/png',
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini Step 1 failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const candidate = data.candidates?.[0]
      if (!candidate) throw new Error('Gemini Step 1: No candidates returned')

      const parts = candidate.content?.parts
      const imagePart = parts?.find((p: any) => p.inline_data || p.inlineData)
      if (!imagePart) {
        throw new Error('Gemini Step 1: No image in response')
      }

      const inlineData = imagePart.inline_data || imagePart.inlineData
      step1Image = inlineData.data
      step1MimeType = inlineData.mime_type || inlineData.mimeType || 'image/png'
      logger.info('Gemini Step 1 upscale completed', {
        mimeType: step1MimeType,
        imageLength: step1Image?.length,
      })
      await metadata.set('progress', 30)
    } else {
      logger.info('Skipping Gemini pre-upscale')
      await metadata.set('progress', 10)
    }

    // Step 2: Provider-specific upscale
    await metadata.set('stage', 'provider_upscale')
    let finalImageUrl: string | null = null
    let finalImageBase64: string | null = null
    const mjGridResult: any = null // For MJ variant selection

    switch (provider) {
      case 'midjourney':
        {
          // Midjourney Edit/Refine performs better with 512x512 inputs
          // If the previous step (Gemini) upscaled it to >512, we must downsize it
          const sharp = (await import('sharp')).default
          const buffer = Buffer.from(step1Image, 'base64')
          const meta = await sharp(buffer).metadata()

          if (meta.width && meta.width > 512) {
            logger.info('Downsizing image for MJ (compatibility)', { originalWidth: meta.width })
            const resizedBuffer = await sharp(buffer)
              .resize(512, 512, { fit: 'fill' }) // Force square 512x512 for tiles
              .toBuffer()
            step1Image = resizedBuffer.toString('base64')
          }

          // LegNext now auto-upscales variant 0, so we get the final image URL directly
          // No need to return a grid and ask for user selection anymore
          const legNextResult = await upscaleWithLegNext(
            step1Image,
            prompt,
            providerConfig.apiKey,
            step1MimeType,
            styleReferenceUrls,
            creativity
          )

          finalImageUrl = legNextResult.imageUrl

          logger.info('Midjourney upscale via LegNext completed', { finalImageUrl })
        }
        break

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
          finalImageUrl = replicateResult.data
        } else {
          finalImageBase64 = replicateResult.data
        }
        break
      }

      case 'stability':
        finalImageBase64 = await upscaleWithStability(
          step1Image,
          providerConfig.apiKey,
          providerConfig.upscaleMode || 'conservative'
        )
        break

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    // Step 3: Upload images to Supabase Storage (accessible from anywhere)
    await metadata.set('stage', 'uploading')

    const timestamp = Date.now()
    const upscaledFilename = `${tileId}_upscaled_${provider}_${timestamp}.png`
    const originalFilename = `original_${tileId}_${timestamp}.png`

    let imageData: string

    if (finalImageUrl) {
      // Fetch image from URL (Midjourney)
      const response = await fetch(finalImageUrl)
      const arrayBuffer = await response.arrayBuffer()
      imageData = Buffer.from(arrayBuffer).toString('base64')
    } else if (finalImageBase64) {
      imageData = finalImageBase64.replace(/^data:image\/\w+;base64,/, '')
    } else {
      throw new Error('No image data to save')
    }

    // Upload to Vercel Blob (works from trigger.dev cloud)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured')
    }

    // Upload upscaled image
    const upscaledBuffer = Buffer.from(imageData, 'base64')
    const upscaledBlob = await put(`upscales/${projectId}/${upscaledFilename}`, upscaledBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    // Upload original image (for comparison in review dialog)
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
      logger.warn('Failed to upload original image:', e)
      // Use a placeholder or existing tile URL
      originalUrl = ''
    }

    const upscaledUrl = upscaledBlob.url

    logger.info('Images uploaded to Vercel Blob', { upscaledUrl, originalUrl })

    // Step 4: Return URLs for review
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
