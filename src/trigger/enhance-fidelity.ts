import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

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
    geminiConfig: {
      apiKey: string
      model?: string
    }
    styleReferenceUrls?: string[]
  }) => {
    const { tileId, projectId, imageBase64, stylePrompt, geminiConfig, styleReferenceUrls } = payload

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

    const finalPrompt = `${stylePrompt}

Apply this artistic style to the image while maintaining the exact same composition, subject matter, and structure. Enhance the visual fidelity and add artistic detail according to the style description above. Ensure each object has a clear, natural-looking shape definition suitable for 3D conversion, especially for characters and people.${styleRefHint}`

    logger.info('Calling Gemini API for fidelity enhancement', {
      model,
      promptLength: finalPrompt.length,
    })

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
      logger.error('Gemini API error', { status: response.status, errorText })
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
    if (!imagePart) {
      const textPart = parts.find((p: any) => p.text)
      if (textPart) {
        throw new Error(`Gemini returned text instead of image: ${textPart.text.substring(0, 100)}...`)
      }
      throw new Error('No image found in Gemini response')
    }

    const inlineData = imagePart.inline_data || imagePart.inlineData
    const enhancedImageBase64 = inlineData.data

    logger.info('Gemini fidelity enhancement completed', {
      imageLength: enhancedImageBase64?.length,
    })

    await metadata.set('progress', 70)

    // Step 2: Save enhanced image to filesystem
    await metadata.set('stage', 'saving')
    const fs = await import('fs')
    const path = await import('path')

    const timestamp = Date.now()
    const filename = `${tileId}_enhanced_${timestamp}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const buffer = Buffer.from(enhancedImageBase64, 'base64')
    fs.writeFileSync(path.join(projectDir, filename), buffer)

    logger.info('Enhanced image saved', { filename })

    await metadata.set('progress', 90)

    // Step 3: Update database with new filename
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

    logger.info('Fidelity enhancement completed successfully', { filename })

    return {
      success: true,
      filename,
      imageUrl: `/projects/${projectId}/${filename}`,
    }
  },
})


