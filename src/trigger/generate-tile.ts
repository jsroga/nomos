import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

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
        generatedImageBase64 = await generateWithMidjourney(prompt, aiConfig as any, isFirstTile, styleReferenceUrls)
        break
      }
      default:
        throw new Error(`Unsupported AI provider: ${aiProvider}`)
    }

    await metadata.set('progress', 70)

    // Save image to filesystem
    await metadata.set('stage', 'saving_image')
    await metadata.set('progress', 80)
    const filename = `${x}_${y}_${Date.now()}.png`

    const fs = await import('fs')
    const path = await import('path')

    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(path.join(projectDir, filename), buffer)

    logger.info('Image saved to filesystem', { filename })

    // Update database
    await metadata.set('stage', 'updating_database')
    await metadata.set('progress', 90)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.from('tiles').upsert(
      {
        project_id: projectId,
        x,
        y,
        tile_prompt: prompt,
        image_filename: filename,
      },
      { onConflict: 'project_id,x,y' }
    )

    if (error) {
      logger.error('Failed to save tile to database', { error })
      throw error
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')
    logger.info('Tile generated successfully', { filename })

    return { success: true, filename, imageUrl: `/projects/${projectId}/${filename}` }
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
              text: `Generate an isometric tile image: ${prompt}. 
                     The image should be 512x512 pixels, isometric perspective, 
                     suitable for a tile-based game world. 
                     Style: painterly, detailed, vibrant colors.${styleRefHint}`,
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
    const inpaintPrompt = `Inpaint the central gray square to seamlessly connect with the surrounding edge context. Fill the gray area with: ${prompt}. Ensure continuous lines, consistent perspective (Isometric), and matching lighting. Do not generate borders or frames.`

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

// Server-side Midjourney image generation via Comet API
// Note: Midjourney doesn't support true inpainting, so we use style references for consistency
async function generateWithMidjourney(
  prompt: string,
  config: { apiKey: string },
  isFirstTile: boolean,
  styleReferenceUrls?: string[]
): Promise<string> {
  logger.info('Starting Midjourney generation via Comet API', { isFirstTile, styleReferenceUrls })

  // Build --sref parameter if style references provided
  const srefParam = styleReferenceUrls?.length 
    ? ` --sref ${styleReferenceUrls.join(' ')}`
    : ''

  // Full prompt for isometric tile with style references
  const fullPrompt = `Isometric tile for a game world: ${prompt}. 512x512, painterly style, detailed, vibrant colors, seamless edges --v 6.1 --ar 1:1${srefParam}`

  // Step 1: Submit imagine task
  const imagineResponse = await fetch('https://api.cometapi.com/mj/submit/imagine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      notifyHook: '',
    }),
  })

  if (!imagineResponse.ok) {
    const errorText = await imagineResponse.text()
    throw new Error(`Comet API imagine error: ${imagineResponse.status} - ${errorText}`)
  }

  const imagineData = await imagineResponse.json()
  const imagineTaskId = imagineData.result

  if (!imagineTaskId) {
    throw new Error('No task ID returned from Comet API imagine')
  }

  logger.info('Comet imagine task submitted', { taskId: imagineTaskId })

  // Step 2: Poll for imagine completion
  await metadata.set('stage', 'waiting_for_midjourney')
  const imagineResult = await pollCometTask(imagineTaskId, config.apiKey, 300)

  if (!imagineResult.imageUrl) {
    throw new Error('No image URL in Comet imagine result')
  }

  logger.info('Comet imagine completed', { imageUrl: imagineResult.imageUrl })

  // Step 3: Submit U1 upscale action to get full resolution
  await metadata.set('stage', 'upscaling_midjourney')
  await metadata.set('progress', 50)

  const actionResponse = await fetch('https://api.cometapi.com/mj/submit/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      customId: imagineResult.buttons?.find((b: any) => b.label === 'U1')?.customId || 'U1',
      taskId: imagineTaskId,
      notifyHook: '',
    }),
  })

  if (!actionResponse.ok) {
    // If action fails, just use the original grid image
    logger.warn('Upscale action failed, using grid image')
    return await fetchImageAsBase64(imagineResult.imageUrl)
  }

  const actionData = await actionResponse.json()
  const actionTaskId = actionData.result

  if (!actionTaskId) {
    // Fall back to grid image
    return await fetchImageAsBase64(imagineResult.imageUrl)
  }

  // Step 4: Poll for upscale completion
  const upscaleResult = await pollCometTask(actionTaskId, config.apiKey, 180)

  const finalUrl = upscaleResult.imageUrl || imagineResult.imageUrl
  logger.info('Midjourney generation complete', { finalUrl })

  // Step 5: Download image and convert to base64
  return await fetchImageAsBase64(finalUrl)
}

// Poll Comet API task for completion
async function pollCometTask(
  taskId: string,
  apiKey: string,
  maxAttempts: number
): Promise<any> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds

    const fetchResponse = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!fetchResponse.ok) {
      attempts++
      continue
    }

    const fetchData = await fetchResponse.json()
    const result = fetchData.result || fetchData
    const status = result.status

    // Update progress based on result.progress if available
    if (result.progress) {
      const progress = Math.min(30 + Math.floor(result.progress * 0.4), 70)
      await metadata.set('progress', progress)
    }

    if (status === 'SUCCESS') {
      logger.info('Comet task completed successfully')
      return result
    }

    if (status === 'FAILED') {
      throw new Error(result.failReason || 'Comet task failed')
    }

    attempts++
  }

  throw new Error('Comet task timed out')
}

// Fetch image from URL and convert to base64
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}
