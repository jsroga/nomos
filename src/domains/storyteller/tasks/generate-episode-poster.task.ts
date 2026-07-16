import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'

interface GenerateEpisodePosterPayload {
  episodeId: string
  projectId: string
  prompt: string
  providerConfig: {
    provider: 'nanobanana'
    apiKey: string
    modelId?: string
  }
}

export const generateEpisodePoster = task({
  id: 'generate-episode-poster',
  maxDuration: 300,
  run: async (payload: GenerateEpisodePosterPayload) => {
    const { episodeId, projectId, prompt, providerConfig } = payload
    const { apiKey, modelId: _modelId } = providerConfig

    logger.info(`Starting episode poster generation for episode ${episodeId}`, { prompt })

    await metadata.set('episode_id', episodeId)
    await metadata.set('project_id', projectId)
    await metadata.set('progress', 0)

    try {
      // 1. Generate Image (Gemini / Nano Banana)
      await metadata.set('stage', 'generating_image')
      const targetModel = 'gemini-3-pro-image-preview'

      // Enhance prompt for Poster style
      // "Movie poster style, cinematic composition, title card, dramatic lighting, high resolution."
      const enhancedPrompt = `${prompt}. Movie poster style, cinematic composition, dramatic lighting, high resolution, highly detailed, vertical aspect ratio.`

      logger.info('Generating with Nano Banana (Gemini)', { model: targetModel })

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: enhancedPrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              // Aspect ratio for poster? Gemini 2.0 Flash supports aspect ratio in prompt or config?
              // For now, prompt instruction "vertical aspect ratio" is best effort.
            },
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        logger.error('Gemini API Error', { error: errText })
        throw new Error(`Gemini API Error: ${errText}`)
      }

      const data = await response.json()
      let imageBase64: string | null = null

      if (data.candidates?.[0]?.content?.parts) {
        for (const part of data.candidates[0].content.parts) {
          if (part.inline_data?.data) {
            imageBase64 = part.inline_data.data
            break
          }
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data
            break
          }
        }
      }

      if (!imageBase64) {
        throw new Error('No image data returned from Gemini API')
      }

      // 2. Save to Disk
      await metadata.set('stage', 'saving_image')
      await metadata.set('progress', 50)

      const filename = `episode_poster_${episodeId}_${Date.now()}.png`
      const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }

      const buffer = Buffer.from(imageBase64, 'base64')
      fs.writeFileSync(path.join(projectDir, filename), buffer)
      logger.info('Image saved to disk', { filename })

      // 3. Update Database
      await metadata.set('stage', 'updating_database')
      await metadata.set('progress', 80)

      const supabase = createSupabaseServiceClient()

      const { error } = await supabase
        .from('episodes')
        .update({
          poster_url: filename,
          poster_prompt: enhancedPrompt,
        })
        .eq('id', episodeId)

      if (error) {
        throw new Error(`Database update failed: ${getErrorMessage(error)}`)
      }

      await metadata.set('progress', 100)
      await metadata.set('stage', 'completed')

      logger.info('Episode poster generation completed successfully', { episodeId, filename })

      return {
        success: true,
        episodeId,
        imageUrl: filename,
        fullUrl: `/projects/${projectId}/${filename}`,
      }
    } catch (error: unknown) {
      logger.error('Poster generation failed', { error: getErrorMessage(error) })
      throw error
    }
  },
})
