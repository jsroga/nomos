import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { FIDELITY_PROMPTS, getCreativityPrompt } from '@/lib/server/prompts'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from './utils/llm-logger'

// NOTE: getCreativityPrompt is now imported from @/constants/prompts

export const enhanceFidelityTask = task({
  id: 'enhance-fidelity',
  maxDuration: 300, // 5 minutes
  retry: {
    maxAttempts: 2, // Don't retry - costs money
  },
  run: async (payload: {
    tileId: string
    projectId: string
    imageBase64: string
    stylePrompt: string
    creativity: number
    geminiConfig: {
      apiKey: string
      model?: string
    }
    styleReferenceUrls?: string[]
  }) => {
    const {
      tileId,
      projectId,
      imageBase64,
      stylePrompt,
      creativity,
      geminiConfig,
      styleReferenceUrls,
    } = payload

    logger.info(`Starting fidelity enhancement for tile ${tileId}`, { projectId })

    // Initialize progress metadata
    await metadata.set('progress', 0)
    await metadata.set('stage', 'initializing')
    await metadata.set('tile_id', tileId)

    // Step 1: Call Gemini API with style prompt
    await metadata.set('stage', 'enhancing')
    await metadata.set('progress', 30)

    const model = geminiConfig.model || 'gemini-3-pro-image-preview'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.apiKey}`

    // Build style reference hint
    const styleRefHint = styleReferenceUrls?.length
      ? ` Use these style references for visual guidance: ${styleReferenceUrls.join(', ')}.`
      : ''

    const creativityPrompt = getCreativityPrompt(creativity || 0.3)

    const finalPrompt = FIDELITY_PROMPTS.GEMINI(stylePrompt, creativityPrompt, styleRefHint)

    const geminiPayload = {
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
    }

    logger.info('Calling Gemini API for fidelity enhancement', {
      model,
      promptLength: finalPrompt.length,
    })

    // Log LLM request start
    logLLMRequestStart({
      provider: 'gemini',
      model,
      prompt: finalPrompt,
      inputImageUrls: ['[Input Image Base64]'],
      input: geminiPayload,
      metadata: {
        task: 'fidelity-enhancement',
        creativity,
      },
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Gemini API error', { status: response.status, errorText })
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: `HTTP ${response.status}: ${errorText}`,
        input: geminiPayload,
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
        input: geminiPayload,
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
        input: geminiPayload,
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
        input: geminiPayload,
        output: data,
      })
      throw new Error('No content parts returned')
    }

    // Find image in response
    const imagePart = parts.find((p: any) => p.inline_data || p.inlineData)
    if (!imagePart) {
      const textPart = parts.find((p: any) => p.text)
      if (textPart) {
        const errorMsg = `Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`
        logLLMRequestError({
          provider: 'gemini',
          model,
          prompt: finalPrompt,
          error: errorMsg,
          input: geminiPayload,
          output: data,
        })
        throw new Error(errorMsg)
      }
      logLLMRequestError({
        provider: 'gemini',
        model,
        prompt: finalPrompt,
        error: 'No image found in Gemini response',
        input: geminiPayload,
        output: data,
      })
      throw new Error('No image found in Gemini response')
    }

    const inlineData = imagePart.inline_data || imagePart.inlineData
    const enhancedImageBase64 = inlineData.data

    // Log successful completion
    logLLMRequestComplete({
      provider: 'gemini',
      model,
      prompt: finalPrompt,
      outputImageUrls: ['[Enhanced Image Base64]'],
      output: {
        finishReason: candidate.finishReason,
        hasImage: true,
      },
    })

    logger.info('Gemini fidelity enhancement completed', {
      imageLength: enhancedImageBase64?.length,
    })

    await metadata.set('progress', 70)

    // Step 2: Upload enhanced image to Vercel Blob
    await metadata.set('stage', 'uploading')

    const timestamp = Date.now()
    const filename = `fidelity/${projectId}/${tileId}_enhanced_${timestamp}.png`

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured')
    }

    const buffer = Buffer.from(enhancedImageBase64, 'base64')
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    const enhancedUrl = blob.url
    logger.info('Enhanced image uploaded to Vercel Blob', { enhancedUrl })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await metadata.set('progress', 90)

    // Step 3: Get original tile filename for comparison
    await metadata.set('stage', 'pending_review')

    const { data: tile } = await supabase
      .from('tiles')
      .select('image_filename')
      .eq('id', tileId)
      .single()

    // Handle both local paths and full URLs for original
    let originalUrl = ''
    if (tile?.image_filename) {
      originalUrl = tile.image_filename.startsWith('http')
        ? tile.image_filename
        : `/projects/${projectId}/${tile.image_filename}`
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')

    logger.info('Fidelity enhancement completed - pending user review', { filename })

    // Return pendingReview: true so UI shows review dialog
    return {
      success: true,
      filename,
      enhancedUrl,
      enhancedBase64: enhancedImageBase64, // Still include for acceptFidelity
      originalUrl,
      pendingReview: true,
    }
  },
})
