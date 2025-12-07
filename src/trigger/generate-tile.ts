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
    styleReferenceUrls?: string[]
  }) => {
    const { projectId, x, y, prompt, aiProvider, aiConfig, styleReferenceUrls } = payload

    logger.info(`Generating tile at ${x},${y} for project ${projectId}`)

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
        generatedImageBase64 = await generateWithGemini(prompt, aiConfig as any, styleReferenceUrls)
        break
      }
      case 'openai': {
        generatedImageBase64 = await generateWithOpenAI(prompt, aiConfig as any, styleReferenceUrls)
        break
      }
      case 'stability': {
        generatedImageBase64 = await generateWithStability(prompt, aiConfig as any, styleReferenceUrls)
        break
      }
      case 'midjourney': {
        generatedImageBase64 = await generateWithMidjourney(prompt, aiConfig as any, styleReferenceUrls)
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
  config: { apiKey: string; model?: string },
  styleReferenceUrls?: string[]
): Promise<string> {
  const model = config.model || 'gemini-3-pro-image-preview'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`

  // Build style reference hint for prompt
  const styleRefHint = styleReferenceUrls?.length 
    ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
    : ''

  const payload = {
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
      responseModalities: ['TEXT', 'IMAGE'],
    },
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
    return inlineData.data
  }

  // Check for text response (error case)
  const textPart = parts.find((p: any) => p.text)
  if (textPart) {
    throw new Error(`Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`)
  }

  throw new Error('No image found in Gemini response')
}

// Server-side OpenAI image generation
async function generateWithOpenAI(
  prompt: string,
  config: { apiKey: string; model?: string },
  styleReferenceUrls?: string[]
): Promise<string> {
  const model = config.model || 'dall-e-3'
  const url = 'https://api.openai.com/v1/images/generations'

  // Build style reference hint for prompt
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

  const response = await fetch(url, {
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
}

// Server-side Stability AI image generation
async function generateWithStability(
  prompt: string,
  config: { apiKey: string; model?: string },
  styleReferenceUrls?: string[]
): Promise<string> {
  const url = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image'

  // Build style reference hint for prompt (append --sref for consistency with MJ style)
  const styleRefHint = styleReferenceUrls?.length 
    ? ` --sref ${styleReferenceUrls.join(' ')}`
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

  const response = await fetch(url, {
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
}

// Server-side Midjourney image generation via Comet API
async function generateWithMidjourney(
  prompt: string,
  config: { apiKey: string },
  styleReferenceUrls?: string[]
): Promise<string> {
  logger.info('Starting Midjourney generation via Comet API', { styleReferenceUrls })

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
