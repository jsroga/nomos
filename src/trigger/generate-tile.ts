import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { GENERATION_PROMPTS, MASK_CONFIG, getGenerationCreativityPrompt } from '@/lib/server/prompts'

export const generateTileTask = task({
  id: 'generate-tile',
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: {
    projectId: string
    x: number
    y: number
    prompt: string
    aiProvider: string
    aiConfig: Record<string, any>
    isFirstTile?: boolean
    styleReferenceUrls?: string[]
    contextImageBase64?: string
  }) => {
    const { projectId, x, y, prompt, aiProvider, aiConfig, isFirstTile = true, styleReferenceUrls, contextImageBase64 } = payload

    logger.info(`Generating tile at ${x},${y} for project ${projectId}`, {
      isFirstTile,
      hasContext: !!contextImageBase64,
      hasStyleRefs: !!styleReferenceUrls?.length
    })

    // Initialize progress metadata
    await metadata.set('progress', 0)
    await metadata.set('stage', 'initializing')
    await metadata.set('tile_x', x)
    await metadata.set('tile_y', y)

    await metadata.set('stage', 'generating_image')
    await metadata.set('progress', 30)

    let generatedImageBase64: string

    // Call AI provider directly (server-side compatible)
    switch (aiProvider) {
      case 'gemini':
      case 'nano-banana': {
        generatedImageBase64 = await generateWithGemini(prompt, aiConfig as any, isFirstTile, styleReferenceUrls, contextImageBase64)
        break
      }
      case 'openai': {
        generatedImageBase64 = await generateWithOpenAI(prompt, aiConfig as any, isFirstTile, styleReferenceUrls, contextImageBase64)
        break
      }
      case 'stability': {
        generatedImageBase64 = await generateWithStability(prompt, aiConfig as any, isFirstTile, styleReferenceUrls, contextImageBase64)
        break
      }
      case 'midjourney': {
        generatedImageBase64 = await generateWithLegNext(prompt, aiConfig as any, isFirstTile, styleReferenceUrls, contextImageBase64)
        break
      }
      default:
        throw new Error(`Unsupported AI provider: ${aiProvider}`)
    }

    await metadata.set('progress', 70)

    // Upload to Vercel Blob (accessible from anywhere, including trigger.dev cloud)
    await metadata.set('stage', 'uploading')
    await metadata.set('progress', 80)

    const filename = `tiles/${projectId}/${x}_${y}_${Date.now()}.png`
    const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Upload generated image to Vercel Blob
    const buffer = Buffer.from(base64Data, 'base64')

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured')
    }

    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    const newUrl = blob.url
    logger.info('Image uploaded to Vercel Blob', { newUrl })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check for existing tile (for regeneration comparison)
    await metadata.set('stage', 'checking_original')
    await metadata.set('progress', 95)

    const { data: existingTile } = await supabase
      .from('tiles')
      .select('image_filename')
      .eq('project_id', projectId)
      .eq('x', x)
      .eq('y', y)
      .single()

    // For original, handle both local paths and full URLs (Vercel Blob)
    let originalUrl: string | undefined
    if (existingTile?.image_filename) {
      if (existingTile.image_filename.startsWith('http')) {
        originalUrl = existingTile.image_filename
      } else {
        originalUrl = `/projects/${projectId}/${existingTile.image_filename}`
      }
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')
    logger.info('Tile generated - pending user review', { filename, hasOriginal: !!originalUrl })

    // Return pendingReview: true so UI shows review dialog
    return {
      success: true,
      filename,
      newUrl,
      newBase64: base64Data, // Still include for acceptGeneration to save locally
      originalUrl,
      isFirstTile: !originalUrl,
      pendingReview: true
    }
  },
})

// Server-side Gemini image generation
async function generateWithGemini(
  prompt: string,
  config: { apiKey: string; model?: string; params?: { modelId?: string } },
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  // Model comes from settings (params.modelId) or fallback to config.model or default
  const model = config.params?.modelId || config.model || 'gemini-3-pro-image-preview'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`

  let payload: any

  if (isFirstTile || !contextImageBase64) {
    // FIRST TILE: Text-only generation with style references
    logger.info('Generating first tile with style references')

    const styleRefHint = styleReferenceUrls?.length
      ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
      : ''

    payload = {
      contents: [
        {
          parts: [
            {
              text: GENERATION_PROMPTS.FIRST_TILE.GEMINI(prompt) + styleRefHint,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    }
  } else {
    // FOLLOW-UP TILE: Use context image with inpainting prompt
    logger.info('Generating follow-up tile with context image for edge matching')

    // The context image has the target area in gray (center 512x512 of 1024x1024)
    // with neighbor edges around it
    const inpaintPrompt = GENERATION_PROMPTS.FOLLOW_UP.GEMINI(prompt)

    payload = {
      contents: [
        {
          parts: [
            { text: inpaintPrompt },
            {
              inline_data: {
                mime_type: 'image/png',
                data: contextImageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]

  if (!candidate) {
    throw new Error('No candidates returned from Gemini')
  }

  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Generation blocked by safety filters')
  }

  const parts = candidate.content?.parts
  if (!parts || parts.length === 0) {
    throw new Error('No content parts returned')
  }

  // Find image in response
  const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)
  if (imagePart) {
    const inlineData = imagePart.inline_data || imagePart.inlineData
    let imageData = inlineData.data

    // For follow-up tiles, we need to crop the center 512x512 from the 1024x1024 result
    if (!isFirstTile && contextImageBase64) {
      imageData = await cropCenterFromBase64(imageData, 256, 256, 512, 512)
    }

    return imageData
  }

  // Check for text response (error case)
  const textPart = parts.find((p: any) => p.text)
  if (textPart) {
    throw new Error(`Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`)
  }

  throw new Error('No image found in Gemini response')
}

// Crop center region from base64 image (server-side using sharp or canvas)
async function cropCenterFromBase64(
  base64Data: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  try {
    // Try to use sharp for server-side cropping
    const sharp = await import('sharp')
    const inputBuffer = Buffer.from(base64Data, 'base64')

    const croppedBuffer = await sharp.default(inputBuffer)
      .extract({ left: x, top: y, width, height })
      .png()
      .toBuffer()

    return croppedBuffer.toString('base64')
  } catch (e) {
    // If sharp is not available, return the original image
    logger.warn('Sharp not available for cropping, returning full image', { error: e })
    return base64Data
  }
}

// Server-side OpenAI image generation
async function generateWithOpenAI(
  prompt: string,
  config: { apiKey: string; model?: string },
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  const model = config.model || 'dall-e-3'

  if (isFirstTile || !contextImageBase64) {
    // FIRST TILE: Text-only generation
    logger.info('OpenAI: Generating first tile with style references')

    const styleRefHint = styleReferenceUrls?.length
      ? ` Style references: ${styleReferenceUrls.join(', ')}.`
      : ''

    const payload = {
      model,
      prompt: `Isometric tile for a game world: ${prompt}. 512x512, painterly style, detailed.${styleRefHint}`,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image data in OpenAI response')
    }

    return data.data[0].b64_json
  } else {
    // FOLLOW-UP TILE: Use DALL-E 2 edit API with context image and mask
    logger.info('OpenAI: Generating follow-up tile with context image')

    // DALL-E edit requires FormData with image and mask files
    // The contextImageBase64 already has the gray center (to be edited)
    // We need to create a mask where the center is transparent
    const formData = new FormData()

    // Convert base64 to Blob for image
    const imageBuffer = Buffer.from(contextImageBase64, 'base64')
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('image', imageBlob, 'image.png')

    // Create mask: center 512x512 transparent (to edit), rest white (keep)
    const maskBase64 = await createEditMask(1024, 256, 256, 512, 512)
    const maskBuffer = Buffer.from(maskBase64, 'base64')
    const maskBlob = new Blob([maskBuffer], { type: 'image/png' })
    formData.append('mask', maskBlob, 'mask.png')

    formData.append('prompt', `Fill seamlessly: ${prompt}. Match surrounding style, continuous edges, isometric perspective.`)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('response_format', 'b64_json')

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI Edit API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image data in OpenAI response')
    }

    // Crop center 512x512 from the 1024x1024 result
    return await cropCenterFromBase64(data.data[0].b64_json, 256, 256, 512, 512)
  }
}

// Create a mask for OpenAI edit: white everywhere except center region (transparent)
async function createEditMask(
  size: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  try {
    const sharp = await import('sharp')

    // Create white image
    const whiteBuffer = await sharp.default({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer()

    // Create transparent center overlay
    const transparentCenter = await sharp.default({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer()

    // Composite: white base with transparent center
    const maskBuffer = await sharp.default(whiteBuffer)
      .composite([{
        input: transparentCenter,
        left: x,
        top: y,
      }])
      .png()
      .toBuffer()

    return maskBuffer.toString('base64')
  } catch (e) {
    logger.warn('Failed to create mask with sharp', { error: e })
    throw new Error('Failed to create edit mask')
  }
}

// Server-side Stability AI image generation
async function generateWithStability(
  prompt: string,
  config: { apiKey: string; model?: string },
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  if (isFirstTile || !contextImageBase64) {
    // FIRST TILE: Text-only generation
    logger.info('Stability: Generating first tile with style references')

    const styleRefHint = styleReferenceUrls?.length
      ? ` Style reference: ${styleReferenceUrls.join(', ')}`
      : ''

    const payload = {
      text_prompts: [
        {
          text: `Isometric tile for a game world: ${prompt}. Painterly style, detailed, vibrant colors.${styleRefHint}`,
          weight: 1,
        },
      ],
      cfg_scale: 7,
      width: 1024,
      height: 1024,
      samples: 1,
      steps: 30,
    }

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Stability API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.artifacts?.[0]?.base64) {
      throw new Error('No image data in Stability response')
    }

    return data.artifacts[0].base64
  } else {
    // FOLLOW-UP TILE: Use inpainting with context image
    logger.info('Stability: Generating follow-up tile with context image')

    // Create mask for center region
    const maskBase64 = await createInpaintMask(1024, 256, 256, 512, 512)

    const formData = new FormData()

    // Add init image (context with gray center)
    const imageBuffer = Buffer.from(contextImageBase64, 'base64')
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('init_image', imageBlob, 'image.png')

    // Add mask (black = inpaint, white = keep)
    const maskBuffer = Buffer.from(maskBase64, 'base64')
    const maskBlob = new Blob([maskBuffer], { type: 'image/png' })
    formData.append('mask_image', maskBlob, 'mask.png')

    formData.append('text_prompts[0][text]', `Fill seamlessly: ${prompt}. Match surrounding style and edges perfectly, isometric perspective.`)
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '7')
    formData.append('samples', '1')
    formData.append('steps', '30')
    formData.append('mask_source', 'MASK_IMAGE_BLACK')

    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image/masking', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Stability Inpaint API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.artifacts?.[0]?.base64) {
      throw new Error('No image data in Stability response')
    }

    // Crop center 512x512 from the 1024x1024 result
    return await cropCenterFromBase64(data.artifacts[0].base64, 256, 256, 512, 512)
  }
}

// Create inpaint mask for Stability: black = inpaint area, white = keep
async function createInpaintMask(
  size: number,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  try {
    const sharp = await import('sharp')

    // Create white image (keep area)
    const whiteBuffer = await sharp.default({
      create: {
        width: size,
        height: size,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer()

    // Create black center (inpaint area)
    const blackCenter = await sharp.default({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    }).png().toBuffer()

    // Composite: white base with black center
    const maskBuffer = await sharp.default(whiteBuffer)
      .composite([{
        input: blackCenter,
        left: x,
        top: y,
      }])
      .png()
      .toBuffer()

    return maskBuffer.toString('base64')
  } catch (e) {
    logger.warn('Failed to create inpaint mask with sharp', { error: e })
    throw new Error('Failed to create inpaint mask')
  }
}


// Server-side style analysis using sharp (replaces client-side Canvas version)
interface StyleInfo {
  brightness: 'bright' | 'medium' | 'dark'
  warmth: 'warm' | 'neutral' | 'cool'
  description: string
}

async function analyzeStyleWithSharp(imageBase64: string): Promise<StyleInfo> {
  try {
    const sharp = (await import('sharp')).default
    const buffer = Buffer.from(imageBase64, 'base64')

    // Get stats from the image
    const { dominant, channels } = await sharp(buffer).stats()

    // Calculate brightness from dominant color
    const avgBrightness = (dominant.r + dominant.g + dominant.b) / 3
    let brightness: 'bright' | 'medium' | 'dark'
    if (avgBrightness > 180) brightness = 'bright'
    else if (avgBrightness > 80) brightness = 'medium'
    else brightness = 'dark'

    // Determine warmth based on red vs blue dominance
    let warmth: 'warm' | 'neutral' | 'cool'
    if (dominant.r > dominant.b + 30) warmth = 'warm'
    else if (dominant.b > dominant.r + 30) warmth = 'cool'
    else warmth = 'neutral'

    const description = `${brightness} ${warmth} palette`

    logger.info('Style analysis complete', { brightness, warmth, description })
    return { brightness, warmth, description }
  } catch (e) {
    logger.warn('Style analysis failed, using defaults', { error: e })
    return { brightness: 'medium', warmth: 'neutral', description: 'medium neutral palette' }
  }
}

// Creativity prompt helper for generation
function getCreativityPrompt(creativity: number): string {
  const level = Math.round(creativity * 100)
  let hint: string
  if (creativity <= 0.2) {
    hint = 'VERY CONSERVATIVE - propagate existing patterns from edges exactly. Do not add new elements.'
  } else if (creativity <= 0.4) {
    hint = 'CONSERVATIVE - closely match surrounding style and patterns. Minimal interpretation.'
  } else if (creativity <= 0.6) {
    hint = 'BALANCED - match edges while adding appropriate detail consistent with style.'
  } else if (creativity <= 0.8) {
    hint = 'CREATIVE - match edges but freely enhance with rich details and textures.'
  } else {
    hint = 'MAXIMUM FREEDOM - match edge connections but add maximum detail and richness.'
  }
  return `CREATIVITY: ${level}/100. ${hint}`
}

// Poll LegNext API task for completion
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
        throw new Error('LegNext task not found')
      }

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText}`)
        attempts++
        continue
      }

      const data = await fetchResponse.json()
      const status = data.status

      // Progress estimation
      let progress = 0
      if (status === 'completed') progress = 100
      else if (status === 'processing') progress = 50 + (attempts % 40)
      else if (status === 'pending') progress = 10

      const scaledProgress = progressOffset + Math.round(progress * 0.65)
      await metadata.set('progress', scaledProgress)

      logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

      if (status === 'completed') {
        logger.info('LegNext task completed successfully', {
          imageUrl: data.output?.image_url
        })
        await metadata.set('progress', progressOffset + 65)
        return data
      } else if (status === 'failed') {
        const errorMsg = data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
        logger.error('LegNext task failed', { error: errorMsg, fullData: data })
        throw new Error(errorMsg)
      }
    } catch (e: any) {
      logger.warn('Polling fetch error:', { error: e.message })
      if (e.message?.includes('not found')) throw e
    }

    attempts++
  }

  throw new Error('LegNext task timeout - Status did not reach completed')
}

// Server-side Midjourney image generation via LegNext API
async function generateWithLegNext(
  prompt: string,
  config: { apiKey: string },
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string
): Promise<string> {
  logger.info('Starting Midjourney generation via LegNext API', { isFirstTile, styleReferenceUrls })

  // Import storage service for public URL upload
  const { storageService } = await import('@/infrastructure/storage/StorageService')
  const { v4: uuidv4 } = await import('uuid')

  let publicImageUrl: string | null = null

  // Step 1: Upload image to get public URL (if we have context or need to generate from scratch)
  if (!isFirstTile && contextImageBase64) {
    // Follow-up tile: use context image
    await metadata.set('stage', 'uploading_context_image')
    await metadata.set('progress', 32)

    const tempFilename = `generate_temp_${uuidv4()}.png`
    publicImageUrl = await storageService.uploadPublicImage(tempFilename, contextImageBase64)

    if (!publicImageUrl) {
      throw new Error('Failed to upload context image for generation')
    }

    logger.info('Context image uploaded', { publicImageUrl })
  } else {
    // First tile: create a blank canvas or use imagine endpoint
    // For now, we'll use a simple text-based generation approach
    // by creating a minimal white canvas to upload
    logger.info('First tile generation - creating blank canvas')
    await metadata.set('stage', 'creating_blank_canvas')

    const sharp = await import('sharp')
    const blankCanvas = await sharp.default({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 1 }
      }
    }).png().toBuffer()

    const blankBase64 = blankCanvas.toString('base64')
    const tempFilename = `generate_temp_${uuidv4()}.png`
    publicImageUrl = await storageService.uploadPublicImage(tempFilename, blankBase64)

    if (!publicImageUrl) {
      throw new Error('Failed to upload blank canvas')
    }
  }

  // Step 2: Build remix prompt based on tile type
  let remixPrompt: string

  if (isFirstTile) {
    // First tile - full creative generation
    remixPrompt = GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(prompt)
  } else {
    // Follow-up tile - analyze context style and match surrounding edges
    let styleInfo = 'medium neutral palette'
    if (contextImageBase64) {
      const analysis = await analyzeStyleWithSharp(contextImageBase64)
      styleInfo = analysis.description
    }

    // Master prompt structure matching Gemini implementation
    remixPrompt = GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(prompt, styleInfo)
  }

  // Add style reference if provided
  if (styleReferenceUrls?.length) {
    remixPrompt += ` --sref ${styleReferenceUrls.join(' ')}`
  }

  logger.info('Using remix prompt', { remixPrompt })

  // Step 3: Submit upload_paint task
  await metadata.set('stage', 'submitting_upload_paint')
  await metadata.set('progress', 35)

  // For follow-up tiles, mask only the center 512x512 area
  // For first tiles, mask the entire canvas
  const maskConfig = isFirstTile ? MASK_CONFIG.FULL_CANVAS : MASK_CONFIG.CENTER_512

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
          width: maskConfig.width,
          height: maskConfig.height,
          points: maskConfig.points,
        }
      ]
    },
    remixPrompt,
  }

  logger.info('Submitting upload_paint with payload', { uploadPaintPayload })

  const uploadPaintResponse = await fetch('https://api.legnext.ai/api/v1/upload-paint', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(uploadPaintPayload),
  })

  if (!uploadPaintResponse.ok) {
    const errorText = await uploadPaintResponse.text()
    throw new Error(`LegNext upload_paint submission failed: ${uploadPaintResponse.status} - ${errorText}`)
  }

  const uploadPaintData = await uploadPaintResponse.json()
  const jobId = uploadPaintData.job_id

  if (!jobId) {
    throw new Error('LegNext upload_paint failed: No job_id returned')
  }

  await metadata.set('upload_paint_job_id', jobId)
  logger.info('Upload_paint task submitted', { jobId })

  // Step 4: Poll for upload_paint completion
  await metadata.set('stage', 'waiting_upload_paint')
  await metadata.set('progress', 40)

  const uploadPaintResult = await pollLegNextTask(jobId, config.apiKey, 300, 40)

  logger.info('Upload_paint completed, submitting upscale', { jobId })

  // Step 5: Submit upscale for first variant (index 0)
  await metadata.set('stage', 'submitting_upscale')
  await metadata.set('progress', 70)

  const upscalePayload = {
    jobId: jobId,
    imageNo: 0,
    type: 0
  }

  logger.info('Submitting upscale with payload', { upscalePayload })

  const upscaleResponse = await fetch('https://api.legnext.ai/api/v1/upscale', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
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

  // Step 6: Poll for upscale completion
  logger.info('Waiting for upscale task', { upscaleJobId })
  const upscaleResult = await pollLegNextTask(upscaleJobId, config.apiKey, 300, 75)

  const imageUrl = upscaleResult.output?.image_url || upscaleResult.output?.image_urls?.[0]

  if (!imageUrl) {
    throw new Error('LegNext upscale result missing image_url')
  }

  logger.info('Midjourney generation via LegNext completed', { imageUrl })

  // Step 7: Download image and convert to base64
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}
