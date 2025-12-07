import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

// Provider types
type UpscaleProvider = 'midjourney' | 'replicate' | 'stability'

interface ProviderConfig {
  apiKey: string
  model?: string
  upscaleMode?: 'conservative' | 'creative'
}

// Comet API polling for Midjourney
async function pollCometTask(
  taskId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30 // Start from 30% after Gemini completes
): Promise<any> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      const fetchData = await fetchResponse.json()

      // Handle both wrapped and direct response formats
      const result = fetchData.result || fetchData
      const status = result.status
      const progress = result.progress

      // Update metadata with progress - scale from 30-95% for MJ phase
      let progressNum = 0
      if (progress) {
        if (typeof progress === 'string') {
          progressNum = parseInt(progress.replace('%', ''), 10) || 0
        } else {
          progressNum = progress
        }
        // Scale: 30% + (progress * 0.65) -> 30-95%
        const scaledProgress = progressOffset + Math.round(progressNum * 0.65)
        await metadata.set('progress', scaledProgress)
      }

      // Log every poll for debugging
      logger.info(`Polling task ${taskId}: Status=${status}, Progress=${progress} (${progressNum}%)`, {
        attempt: attempts,
        rawResult: JSON.stringify(result).substring(0, 500)
      })

      if (status === 'SUCCESS') {
        logger.info('Comet task completed successfully', {
          imageUrl: result.imageUrl,
          buttons: result.buttons?.length || 0
        })
        await metadata.set('progress', 95)
        return result // Return full result including buttons for MJ variant selection
      } else if (status === 'FAILED' || status === 'FAILURE') {
        logger.error('Comet task failed', { failReason: result.failReason, result })
        throw new Error(result.failReason || 'Task failed')
      }
    } catch (e: any) {
      if (e.message?.includes('FAILED') || e.message?.includes('Task failed')) {
        throw e
      }
      logger.warn('Polling fetch error:', { error: e.message })
    }

    attempts++
  }

  throw new Error('Task timeout - Status did not reach SUCCESS')
}

// Midjourney upscale via Comet API - returns a 2x2 grid for variant selection
async function upscaleWithMidjourneyGrid(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  mimeType: string = 'image/png',
  styleReferenceUrls?: string[]
): Promise<{ id: string; imageUrl: string; buttons: any[] }> {
  logger.info('Starting Midjourney upscale via /mj/submit/edits (grid)', { mimeType, styleReferenceUrls })
  await metadata.set('stage', 'submitting_edits')
  await metadata.set('progress', 32) // Just after Gemini's 30%

  // Use the Editor endpoint for direct image upscaling
  // Docs: https://apidoc.cometapi.com/midjourney-submit-editor
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  // Build --sref parameter if style references provided
  const srefParam = styleReferenceUrls?.length 
    ? ` --sref ${styleReferenceUrls.join(' ')}`
    : ''

  // For edits/upscale, use a simple generic prompt - NOT the tile's original prompt
  // The original prompt may contain content that triggers Midjourney content filters
  const upscalePrompt = `enhance image quality, add fine details, increase resolution, sharpen, high fidelity${srefParam}`
  logger.info('Submitting to /mj/submit/edits', {
    promptLength: upscalePrompt.length,
    imageBase64Length: cleanBase64.length,
    mimeType,
    originalPrompt: prompt?.substring(0, 100) // Log original for debugging but don't use it
  })

  // Retry logic for queue-full errors
  const maxRetries = 5
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry: 30s, 60s, 90s, 120s
      const waitSeconds = 30 * attempt
      logger.info(`Queue full, waiting ${waitSeconds}s before retry (attempt ${attempt + 1}/${maxRetries})`)
      await metadata.set('stage', `waiting_queue_${waitSeconds}s`)
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    }

    const response = await fetch('https://api.cometapi.com/mj/submit/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: upscalePrompt,
        image: `data:${mimeType};base64,${cleanBase64}`,
      }),
    })

    const responseText = await response.text()
    logger.info('Raw /mj/submit/edits response', {
      status: response.status,
      ok: response.ok,
      responseText: responseText.substring(0, 500),
      attempt: attempt + 1
    })

    // Check for queue-full error (code 23)
    if (responseText.includes('"code":23') || responseText.includes('Queue is full')) {
      lastError = new Error(`Comet API queue full (attempt ${attempt + 1}/${maxRetries})`)
      continue // Retry
    }

    if (!response.ok) {
      throw new Error(`Comet API /mj/submit/edits failed: ${response.status} - ${responseText.substring(0, 200)}`)
    }

    // Success - parse and return
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Failed to parse Comet API response: ${responseText.substring(0, 200)}`)
    }

    logger.info('Edits response parsed', { code: data.code, description: data.description, result: data.result })

    if (data.code !== 1) {
      throw new Error(data.description || 'Failed to submit edits task')
    }

    const taskId = data.result
    await metadata.set('upscale_task_id', taskId)
    await metadata.set('stage', 'waiting_mj_upscale')
    await metadata.set('progress', 35)

    // Poll for completion
    logger.info('Waiting for edits task', { taskId })
    const result = await pollCometTask(taskId, apiKey, 300, 35) // Start progress from 35%

    // Log full result for debugging
    logger.info('Full Comet result', {
      fullResult: JSON.stringify(result),
      keys: Object.keys(result)
    })

    // Try multiple possible field names for the image URL
    const imageUrl = result.imageUrl || result.image_url || result.url || result.image || result.output

    if (!imageUrl) {
      logger.error('No imageUrl in result - tried imageUrl, image_url, url, image, output', {
        result: JSON.stringify(result).substring(0, 1000)
      })
      throw new Error('Comet API returned no imageUrl')
    }

    logger.info('Upscale grid completed', { imageUrl, buttons: result.buttons?.length || 0 })

    // Return full result for variant selection
    return {
      id: result.id || taskId,
      imageUrl,
      buttons: result.buttons || []
    }
  }

  // All retries exhausted
  throw new Error(`Comet API queue full after ${maxRetries} attempts. Please try again later.`)
}

// Replicate upscale
async function upscaleWithReplicate(
  imageBase64: string,
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  logger.info('Starting Replicate upscale', { model })
  await metadata.set('stage', 'replicate_processing')

  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: apiKey })

  const output = await replicate.run(model as any, {
    input: {
      image: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
      prompt,
    },
  })

  await metadata.set('progress', 100)
  return String(output)
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
  formData.append('prompt', 'upscale maintaining the same style, high quality, detailed, sharp')
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
      throw new Error(`Stability API error (${submitResponse.status}): ${submitResponse.data?.message}`)
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
          new Uint8Array(resultResponse.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
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

    logger.info(`Starting upscale for tile ${tileId}`, { provider, projectId, skipGeminiPreUpscale })

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
      const finalPrompt = `Upscale this image to be higher resolution with updated fidelity and significantly more details. Maintain the exact same style, colors, and composition. ${prompt}${styleRefHint}`

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
      logger.info('Gemini Step 1 upscale completed', { mimeType: step1MimeType, imageLength: step1Image?.length })
      await metadata.set('progress', 30)
    } else {
      logger.info('Skipping Gemini pre-upscale')
      await metadata.set('progress', 10)
    }

    // Step 2: Provider-specific upscale
    await metadata.set('stage', 'provider_upscale')
    let finalImageUrl: string | null = null
    let finalImageBase64: string | null = null
    let mjGridResult: any = null // For MJ variant selection

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

          // MJ returns a grid - we need to return it for variant selection
          mjGridResult = await upscaleWithMidjourneyGrid(step1Image, prompt, providerConfig.apiKey, step1MimeType, styleReferenceUrls)
          // Return early with grid data - user needs to pick a variant
          await metadata.set('progress', 100)
          await metadata.set('stage', 'awaiting_variant_selection')
          return {
            success: true,
            requiresVariantSelection: true,
            provider: 'midjourney',
            gridImageUrl: mjGridResult.imageUrl,
            taskId: mjGridResult.id,
            buttons: mjGridResult.buttons, // U1, U2, U3, U4 buttons
            tileId,
            projectId,
          }
        }

      case 'replicate':
        if (!providerConfig.model) {
          throw new Error('Replicate model is required')
        }
        finalImageBase64 = await upscaleWithReplicate(
          step1Image,
          prompt,
          providerConfig.apiKey,
          providerConfig.model
        )
        break

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

    // Step 3: Save image to filesystem
    await metadata.set('stage', 'saving')
    const fs = await import('fs')
    const path = await import('path')

    const timestamp = Date.now()
    const filename = `${tileId}_upscaled_${provider}_${timestamp}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

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

    const buffer = Buffer.from(imageData, 'base64')
    fs.writeFileSync(path.join(projectDir, filename), buffer)

    logger.info('Image saved', { filename })

    // Step 4: Update database
    await metadata.set('stage', 'updating_db')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from('tiles')
      .update({ image_filename: filename })
      .eq('id', tileId)

    if (error) {
      logger.error('Failed to update tile in database', { error })
      // Don't throw - image is saved, just log the error
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    logger.info('Upscale completed successfully', { filename, provider })

    return {
      success: true,
      filename,
      imageUrl: `/projects/${projectId}/${filename}`,
      provider,
    }
  },
})
