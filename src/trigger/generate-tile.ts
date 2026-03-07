import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { GENERATION_PROMPTS, MASK_CONFIG } from '@/lib/server/prompts'
import { imageService, StyleInfo } from '@/lib/server/image-service'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { storageService } from '@/infrastructure/storage/StorageService'
import { getErrorMessage } from '@/lib/error-utils'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from './utils/llm-logger'

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
    aiConfig: Record<string, unknown>
    isFirstTile?: boolean
    styleReferenceUrls?: string[]
    styleContext?: string
    contextImageBase64?: string
    neighbors?: any // Adding neighbors for server-side assembly
  }) => {
    const {
      projectId,
      x,
      y,
      prompt,
      aiProvider,
      aiConfig,
      isFirstTile = true,
      styleReferenceUrls,
      styleContext,
      neighbors,
    } = payload

    let contextImageBase64 = payload.contextImageBase64

    logger.info(`Generating tile at ${x},${y} for project ${projectId}`, {
      isFirstTile,
      hasContext: !!contextImageBase64,
      hasNeighbors: !!neighbors,
      hasStyleRefs: !!styleReferenceUrls?.length,
    })

    // Initialize progress metadata
    await metadata.set('progress', 0)
    await metadata.set('stage', 'initializing')
    await metadata.set('tile_x', x)
    await metadata.set('tile_y', y)

    // Server-side context assembly if needed
    if (!isFirstTile && !contextImageBase64 && neighbors) {
      await metadata.set('stage', 'assembling_context')
      logger.info('Assembling context image on server')
      const { image } = await imageService.assembleContext(
        {
          targetX: x,
          targetY: y,
          neighbors,
          allTiles: {}, // Not needed for assembly
        },
        1024
      )
      contextImageBase64 = image.toString('base64')
    }

    await metadata.set('stage', 'generating_image')
    await metadata.set('progress', 30)

    let generatedImageBase64: string

    // Call AI provider directly (server-side compatible)
    switch (aiProvider) {
      case 'gemini':
      case 'nano-banana': {
        generatedImageBase64 = await generateWithGemini(
          prompt,
          aiConfig as any,
          isFirstTile,
          styleReferenceUrls,
          contextImageBase64,
          styleContext
        )
        break
      }
      case 'openai': {
        generatedImageBase64 = await generateWithOpenAI(
          prompt,
          aiConfig as any,
          isFirstTile,
          styleReferenceUrls,
          contextImageBase64
        )
        break
      }
      case 'stability': {
        generatedImageBase64 = await generateWithStability(
          prompt,
          aiConfig as any,
          isFirstTile,
          styleReferenceUrls,
          contextImageBase64
        )
        break
      }
      case 'midjourney': {
        generatedImageBase64 = await generateWithLegNext(
          prompt,
          aiConfig as any,
          isFirstTile,
          styleReferenceUrls,
          contextImageBase64,
          styleContext
        )
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
    // Note: base64 removed from response to reduce payload size
    // Images are stored in Vercel Blob and accessed via newUrl
    return {
      success: true,
      filename,
      newUrl,
      originalUrl,
      isFirstTile: !originalUrl,
      pendingReview: true,
    }
  },
})

// Server-side Gemini image generation
async function generateWithGemini(
  prompt: string,
  config: { apiKey: string; model?: string; params?: { modelId?: string } },
  isFirstTile: boolean,
  styleReferenceUrls?: string[],
  contextImageBase64?: string,
  styleContext?: string
): Promise<string> {
  // Model comes from settings (params.modelId) or fallback to config.model or default
  const model = config.params?.modelId || config.model || 'gemini-3-pro-image-preview'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`

  let payload: any
  let finalPrompt: string

  // Fetch style reference images to pass as actual inline_data parts
  const styleImageParts: any[] = []
  if (styleReferenceUrls?.length) {
    for (const url of styleReferenceUrls) {
      try {
        const resp = await fetch(url)
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const contentType = resp.headers.get('content-type') || 'image/png'
          styleImageParts.push({ inline_data: { mime_type: contentType, data: base64 } })
        }
      } catch {
        // skip unreachable URLs
      }
    }
  }

  if (isFirstTile || !contextImageBase64) {
    // FIRST TILE: Generation with style reference images
    logger.info('Generating first tile with style references')

    finalPrompt = GENERATION_PROMPTS.FIRST_TILE.GEMINI(prompt, styleContext)

    payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            ...styleImageParts,
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.4,
        topK: 32,
        topP: 1,
      },
    }
  } else {
    // FOLLOW-UP TILE: Use context image with inpainting prompt
    logger.info('Generating follow-up tile with context image for edge matching')

    finalPrompt = GENERATION_PROMPTS.FOLLOW_UP.GEMINI(prompt)

    payload = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
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

  // Log LLM request start
  logLLMRequestStart({
    provider: 'gemini',
    model,
    prompt: finalPrompt,
    inputImageUrls: styleReferenceUrls,
    input: payload,
    metadata: {
      isFirstTile,
      hasContextImage: !!contextImageBase64,
    },
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: payload,
      })
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]

    if (!candidate) {
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: 'No candidates returned from Gemini',
        input: payload,
        output: data,
      })
      throw new Error('No candidates returned from Gemini')
    }

    if (candidate.finishReason === 'SAFETY') {
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: 'Generation blocked by safety filters',
        input: payload,
        output: data,
      })
      throw new Error('Generation blocked by safety filters')
    }

    const parts = candidate.content?.parts
    if (!parts || parts.length === 0) {
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: 'No content parts returned',
        input: payload,
        output: data,
      })
      throw new Error('No content parts returned')
    }

    // Find image in response
    const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)
    if (imagePart) {
      const inlineData = imagePart.inline_data || imagePart.inlineData
      let imageData = inlineData.data

      // For follow-up tiles, extract the center 512x512 tile from the result
      if (!isFirstTile && contextImageBase64) {
        let imgBuffer = Buffer.from(imageData, 'base64')
        const meta = await sharp(imgBuffer).metadata()
        const w = meta.width || 0
        const h = meta.height || 0
        logger.info('Gemini output dimensions', { width: w, height: h })

        // If Gemini returned a different size, resize to 1024x1024 first
        if (w !== 1024 || h !== 1024) {
          logger.warn('Gemini output is not 1024x1024, resizing before crop', { width: w, height: h })
          imgBuffer = await sharp(imgBuffer).resize(1024, 1024, { fit: 'fill' }).png().toBuffer()
        }

        imgBuffer = await imageService.crop(imgBuffer, { x: 256, y: 256, width: 512, height: 512 })
        imageData = imgBuffer.toString('base64')
      }

      // Log successful completion
      logLLMRequestComplete({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        outputImageUrls: ['[Base64 Image Data]'],
        output: {
          finishReason: candidate.finishReason,
          hasImage: true,
        },
      })

      return imageData
    }

    // Check for text response (error case)
    const textPart = parts.find((p: any) => p.text)
    if (textPart) {
      const errorMsg = `Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: errorMsg,
        input: payload,
        output: data,
      })
      throw new Error(errorMsg)
    }

    logLLMRequestError({
      provider: 'gemini',
      model,
      prompt: finalPrompt,
      error: 'No image found in Gemini response',
      input: payload,
      output: data,
    })
    throw new Error('No image found in Gemini response')
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Gemini API error')) {
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: error.message,
        input: payload,
      })
    }
    throw error
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

    const finalPrompt = `Isometric tile for a game world: ${prompt}. 512x512, painterly style, detailed.${styleRefHint}`
    const payload = {
      model,
      prompt: finalPrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }

    // Log LLM request start
    logLLMRequestStart({
      provider: 'openai',
      model,
      prompt: finalPrompt,
      inputImageUrls: styleReferenceUrls,
      input: payload,
      metadata: {
        isFirstTile,
        endpoint: 'images/generations',
      },
    })

    try {
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
        logLLMRequestError({
          provider: 'openai',
          model,
          prompt: finalPrompt,
          error: `HTTP ${response.status}: ${errorText}`,
          input: payload,
        })
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.data?.[0]?.b64_json) {
        logLLMRequestError({
          provider: 'openai',
          model,
          prompt: finalPrompt,
          error: 'No image data in OpenAI response',
          input: payload,
          output: data,
        })
        throw new Error('No image data in OpenAI response')
      }

      // Log successful completion
      logLLMRequestComplete({
        provider: 'openai',
        model,
        prompt: finalPrompt,
        outputImageUrls: ['[Base64 Image Data]'],
        output: {
          size: data.data[0].size,
          revised_prompt: data.data[0].revised_prompt,
        },
      })

      return data.data[0].b64_json
    } catch (error) {
      if (error instanceof Error && !error.message.includes('OpenAI API error')) {
        logLLMRequestError({
          provider: 'openai',
          model,
          prompt: finalPrompt,
          error: error.message,
          input: payload,
        })
      }
      throw error
    }
  } else {
    // FOLLOW-UP TILE: Use DALL-E 2 edit API with context image and mask
    logger.info('OpenAI: Generating follow-up tile with context image')

    const finalPrompt = `Fill seamlessly: ${prompt}. Match surrounding style, continuous edges, isometric perspective.`

    // DALL-E edit requires FormData with image and mask files
    // The contextImageBase64 already has the gray center (to be edited)
    // We need to create a mask where the center is transparent
    const formData = new FormData()

    // Convert base64 to Blob for image
    const imageBuffer = Buffer.from(contextImageBase64, 'base64')
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('image', imageBlob, 'image.png')

    // Create mask: center 512x512 transparent (to edit), rest white (keep)
    const { mask } = await imageService.assembleContext(
      {
        targetX: 0, // Not strictly needed for just a mask but interface expects it
        targetY: 0,
        neighbors: {},
        allTiles: {},
      },
      1024
    )
    // Convert Buffer to Uint8Array for Blob compatibility if needed
    formData.append('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png')

    formData.append('prompt', finalPrompt)
    formData.append('n', '1')
    formData.append('size', '1024x1024')
    formData.append('response_format', 'b64_json')

    // Log LLM request start
    logLLMRequestStart({
      provider: 'openai',
      model: 'dall-e-2',
      prompt: finalPrompt,
      inputImageUrls: ['[Context Image Base64]'],
      input: {
        prompt: finalPrompt,
        size: '1024x1024',
        hasMask: true,
      },
      metadata: {
        isFirstTile: false,
        endpoint: 'images/edits',
      },
    })

    try {
      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        logLLMRequestError({
          provider: 'openai',
          model: 'dall-e-2',
          prompt: finalPrompt,
          error: `HTTP ${response.status}: ${errorText}`,
          input: { prompt: finalPrompt },
        })
        throw new Error(`OpenAI Edit API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.data?.[0]?.b64_json) {
        logLLMRequestError({
          provider: 'openai',
          model: 'dall-e-2',
          prompt: finalPrompt,
          error: 'No image data in OpenAI response',
          input: { prompt: finalPrompt },
          output: data,
        })
        throw new Error('No image data in OpenAI response')
      }

      // Crop center 512x512 from the 1024x1024 result
      const croppedBuffer = await imageService.crop(Buffer.from(data.data[0].b64_json, 'base64'), {
        x: 256,
        y: 256,
        width: 512,
        height: 512,
      })

      // Log successful completion
      logLLMRequestComplete({
        provider: 'openai',
        model: 'dall-e-2',
        prompt: finalPrompt,
        outputImageUrls: ['[Base64 Image Data]'],
        output: {
          size: data.data[0].size,
        },
      })

      return croppedBuffer.toString('base64')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('OpenAI Edit API error')) {
        logLLMRequestError({
          provider: 'openai',
          model: 'dall-e-2',
          prompt: finalPrompt,
          error: error.message,
          input: { prompt: finalPrompt },
        })
      }
      throw error
    }
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

    const finalPrompt = `Isometric tile for a game world: ${prompt}. Painterly style, detailed, vibrant colors.${styleRefHint}`
    const payload = {
      text_prompts: [
        {
          text: finalPrompt,
          weight: 1,
        },
      ],
      cfg_scale: 7,
      width: 1024,
      height: 1024,
      samples: 1,
      steps: 30,
    }

    // Log LLM request start
    logLLMRequestStart({
      provider: 'stability',
      model: config.model || 'stable-diffusion-xl-1024-v1-0',
      prompt: finalPrompt,
      inputImageUrls: styleReferenceUrls,
      input: payload,
      metadata: {
        isFirstTile,
        endpoint: 'text-to-image',
      },
    })

    try {
      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: `HTTP ${response.status}: ${errorText}`,
          input: payload,
        })
        throw new Error(`Stability API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.artifacts?.[0]?.base64) {
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: 'No image data in Stability response',
          input: payload,
          output: data,
        })
        throw new Error('No image data in Stability response')
      }

      // Log successful completion
      logLLMRequestComplete({
        provider: 'stability',
        model: config.model || 'stable-diffusion-xl-1024-v1-0',
        prompt: finalPrompt,
        outputImageUrls: ['[Base64 Image Data]'],
        output: {
          artifactCount: data.artifacts?.length || 0,
        },
      })

      return data.artifacts[0].base64
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Stability API error')) {
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: error.message,
          input: payload,
        })
      }
      throw error
    }
  } else {
    // FOLLOW-UP TILE: Use inpainting with context image
    logger.info('Stability: Generating follow-up tile with context image')

    const finalPrompt = `Fill seamlessly: ${prompt}. Match surrounding style and edges perfectly, isometric perspective.`

    // Create mask for center region
    const { mask } = await imageService.assembleContext(
      {
        targetX: 0,
        targetY: 0,
        neighbors: {},
        allTiles: {},
      },
      1024
    )
    const maskBase64 = mask.toString('base64')

    const formData = new FormData()

    // Add init image (context with gray center)
    const imageBuffer = Buffer.from(contextImageBase64, 'base64')
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('init_image', imageBlob, 'image.png')

    // Add mask (black = inpaint, white = keep)
    const maskBuffer = Buffer.from(maskBase64, 'base64')
    const maskBlob = new Blob([maskBuffer], { type: 'image/png' })
    formData.append('mask_image', maskBlob, 'mask.png')

    formData.append('text_prompts[0][text]', finalPrompt)
    formData.append('text_prompts[0][weight]', '1')
    formData.append('cfg_scale', '7')
    formData.append('samples', '1')
    formData.append('steps', '30')
    formData.append('mask_source', 'MASK_IMAGE_BLACK')

    // Log LLM request start
    logLLMRequestStart({
      provider: 'stability',
      model: config.model || 'stable-diffusion-xl-1024-v1-0',
      prompt: finalPrompt,
      inputImageUrls: ['[Context Image Base64]'],
      input: {
        prompt: finalPrompt,
        cfg_scale: 7,
        steps: 30,
        hasMask: true,
      },
      metadata: {
        isFirstTile: false,
        endpoint: 'image-to-image/masking',
      },
    })

    try {
      const response = await fetch(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image/masking',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            Accept: 'application/json',
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: `HTTP ${response.status}: ${errorText}`,
          input: { prompt: finalPrompt },
        })
        throw new Error(`Stability Inpaint API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.artifacts?.[0]?.base64) {
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: 'No image data in Stability response',
          input: { prompt: finalPrompt },
          output: data,
        })
        throw new Error('No image data in Stability response')
      }

      // Crop center 512x512 from the 1024x1024 result
      const croppedBuffer = await imageService.crop(Buffer.from(data.artifacts[0].base64, 'base64'), {
        x: 256,
        y: 256,
        width: 512,
        height: 512,
      })

      // Log successful completion
      logLLMRequestComplete({
        provider: 'stability',
        model: config.model || 'stable-diffusion-xl-1024-v1-0',
        prompt: finalPrompt,
        outputImageUrls: ['[Base64 Image Data]'],
        output: {
          artifactCount: data.artifacts?.length || 0,
        },
      })

      return croppedBuffer.toString('base64')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Stability Inpaint API error')) {
        logLLMRequestError({
          provider: 'stability',
          model: config.model || 'stable-diffusion-xl-1024-v1-0',
          prompt: finalPrompt,
          error: error.message,
          input: { prompt: finalPrompt },
        })
      }
      throw error
    }
  }
}

// Style Analysis is now handled by ImageService

async function analyzeStyleWithSharp(imageBase64: string): Promise<StyleInfo> {
  return imageService.analyzeStyle(Buffer.from(imageBase64, 'base64'))
}

// Creativity prompt helper for generation
function getCreativityPrompt(creativity: number): string {
  const level = Math.round(creativity * 100)
  let hint: string
  if (creativity <= 0.2) {
    hint =
      'VERY CONSERVATIVE - propagate existing patterns from edges exactly. Do not add new elements.'
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
          imageUrl: data.output?.image_url,
        })
        await metadata.set('progress', progressOffset + 65)
        return data
      } else if (status === 'failed') {
        const errorMsg = data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
        logger.error('LegNext task failed', { error: errorMsg, fullData: data })
        throw new Error(errorMsg)
      }
    } catch (e: unknown) {
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
      if (getErrorMessage(e)?.includes('not found')) throw e
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
  contextImageBase64?: string,
  styleContext?: string
): Promise<string> {
  logger.info('Starting Midjourney generation via LegNext API', { isFirstTile, styleReferenceUrls })

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
    // First tile: generate a neutral 1024x1024 canvas and upload it
    // (MJ CDN URLs are blocked by Cloudflare; text prompt + style refs drive the actual generation)
    logger.info('First tile generation - creating blank canvas for upload_paint')
    await metadata.set('stage', 'uploading_blank_canvas')
    await metadata.set('progress', 30)

    const blankPng = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 180, g: 180, b: 180 } },
    })
      .png()
      .toBuffer()

    const blankBase64 = `data:image/png;base64,${blankPng.toString('base64')}`
    const tempFilename = `first_tile_canvas_${uuidv4()}.png`
    publicImageUrl = await storageService.uploadPublicImage(tempFilename, blankBase64)

    if (!publicImageUrl) {
      throw new Error('Failed to upload blank canvas for first tile generation')
    }

    logger.info('Blank canvas uploaded for first tile', { publicImageUrl })
  }

  // Step 2: Build remix prompt based on tile type
  let remixPrompt: string

  if (isFirstTile) {
    // First tile - full creative generation (styleContext from project preset or default)
    remixPrompt = GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(prompt, styleContext)
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
        },
      ],
    },
    remixPrompt,
  }

  logger.info('Submitting upload_paint with payload', { uploadPaintPayload })

  // Log LLM request start
  logLLMRequestStart({
    provider: 'midjourney',
    model: 'legnext-upload-paint',
    prompt: remixPrompt,
    inputImageUrls: publicImageUrl ? [publicImageUrl] : undefined,
    input: uploadPaintPayload,
    metadata: {
      isFirstTile,
      endpoint: 'upload-paint',
    },
  })

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
    logLLMRequestError({
      provider: 'midjourney',
      model: 'legnext-upload-paint',
      prompt: remixPrompt,
      error: `HTTP ${uploadPaintResponse.status}: ${errorText}`,
      input: uploadPaintPayload,
    })
    throw new Error(
      `LegNext upload_paint submission failed: ${uploadPaintResponse.status} - ${errorText}`
    )
  }

  const uploadPaintData = await uploadPaintResponse.json()
  const jobId = uploadPaintData.job_id

  if (!jobId) {
    logLLMRequestError({
      provider: 'midjourney',
      model: 'legnext-upload-paint',
      prompt: remixPrompt,
      error: 'No job_id returned',
      input: uploadPaintPayload,
      output: uploadPaintData,
    })
    throw new Error('LegNext upload_paint failed: No job_id returned')
  }

  await metadata.set('upload_paint_job_id', jobId)
  logger.info('Upload_paint task submitted', { jobId })

  // Step 4: Poll for upload_paint completion
  await metadata.set('stage', 'waiting_upload_paint')
  await metadata.set('progress', 40)

  const uploadPaintResult = await pollLegNextTask(jobId, config.apiKey, 300, 40)

  // Log upload_paint completion
  const uploadPaintImageUrl =
    uploadPaintResult.output?.image_url || uploadPaintResult.output?.image_urls?.[0]
  logLLMRequestComplete({
    provider: 'midjourney',
    model: 'legnext-upload-paint',
    prompt: remixPrompt,
    outputImageUrls: uploadPaintImageUrl ? [uploadPaintImageUrl] : undefined,
    output: uploadPaintResult.output,
  })

  logger.info('Upload_paint completed, submitting upscale', { jobId })

  // Step 5: Submit upscale for first variant (index 0)
  await metadata.set('stage', 'submitting_upscale')
  await metadata.set('progress', 70)

  const upscalePayload = {
    jobId: jobId,
    imageNo: 0,
    type: 0,
  }

  logger.info('Submitting upscale with payload', { upscalePayload })

  // Log upscale request start
  logLLMRequestStart({
    provider: 'midjourney',
    model: 'legnext-upscale',
    prompt: remixPrompt,
    inputImageUrls: uploadPaintImageUrl ? [uploadPaintImageUrl] : undefined,
    input: upscalePayload,
    metadata: {
      endpoint: 'upscale',
    },
  })

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
    logLLMRequestError({
      provider: 'midjourney',
      model: 'legnext-upscale',
      prompt: remixPrompt,
      error: `HTTP ${upscaleResponse.status}: ${errorText}`,
      input: upscalePayload,
    })
    throw new Error(`LegNext upscale submission failed: ${upscaleResponse.status} - ${errorText}`)
  }

  const upscaleData = await upscaleResponse.json()
  const upscaleJobId = upscaleData.job_id

  if (!upscaleJobId) {
    logLLMRequestError({
      provider: 'midjourney',
      model: 'legnext-upscale',
      prompt: remixPrompt,
      error: 'No job_id returned',
      input: upscalePayload,
      output: upscaleData,
    })
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
    logLLMRequestError({
      provider: 'midjourney',
      model: 'legnext-upscale',
      prompt: remixPrompt,
      error: 'LegNext upscale result missing image_url',
      input: upscalePayload,
      output: upscaleResult,
    })
    throw new Error('LegNext upscale result missing image_url')
  }

  // Log upscale completion
  logLLMRequestComplete({
    provider: 'midjourney',
    model: 'legnext-upscale',
    prompt: remixPrompt,
    outputImageUrls: [imageUrl],
    output: upscaleResult.output,
  })

  logger.info('Midjourney generation via LegNext completed', { imageUrl })

  // Step 7: Download image and convert to base64
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // For follow-up tiles, crop the center 512x512 from the 1024x1024 context canvas
  // (matches behavior of Gemini, OpenAI, and Stability providers)
  if (!isFirstTile && contextImageBase64) {
    const croppedBuffer = await imageService.crop(buffer, {
      x: 256,
      y: 256,
      width: 512,
      height: 512,
    })
    return croppedBuffer.toString('base64')
  }

  return buffer.toString('base64')
}
