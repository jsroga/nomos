import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'

interface GenerateCombinedStoryboardPayload {
  episodeId: string
  projectId: string
  beats: { logline: string; visualHook?: string; imagePrompt?: string }[]
  providerConfig: {
    provider: 'nanobanana'
    apiKey: string
    modelId?: string
  }
}

export const generateCombinedStoryboard = task({
  id: 'generate-combined-storyboard',
  maxDuration: 600, // Long duration for high res generation
  run: async (payload: GenerateCombinedStoryboardPayload) => {
    const { episodeId, projectId, beats, providerConfig } = payload
    const { apiKey, modelId } = providerConfig

    logger.info(
      `Starting combined storyboard generation for episode ${episodeId} with ${beats.length} beats.`
    )

    await metadata.set('episode_id', episodeId)
    await metadata.set('project_id', projectId)
    await metadata.set('stage', 'prompting')

    try {
      // 1. Construct Prompt
      // 1. Construct Smart Prompt
      const scenesDescription = beats
        .map((b, i) => {
          const desc = b.imagePrompt || b.visualHook || b.logline
          return `[Panel ${i + 1}]: ${desc}`
        })
        .join('\n')

      const prompt = `
Role: You are a technical artist creating a single "Story Book Wireframe" or "Visual Script" layout.
Task: Create ONE large image that acts as a wireframe summary of the entire episode's visual flow.

Style & Format:
- STYLE: Wireframe / Sketch / Architectural Storyboard.
- FORMAT: A single image containing multiple "panels" or "vignettes" arranged in a logical flow (e.g., a grid, a winding path, or a comic-book layout).
- CONTENT: You MUST include a distinct visual representation for EACH of the beat descriptions provided below.
- LOOK: Clean lines, blueprint aesthetic or rough pencil sketch. Not a realistic movie poster.
- DIRECTIVE: Do it like Christopher Nolan would do. Complex, non-linear, cerebral, and visually grand.

Input Beat Descriptions (Visualize ALL of these in the single image):
${scenesDescription}

Execution:
- Do not make separate images.
- Bundle all these scenes into one cohesive "Story Map" or "Wireframe" image.
- Labeling or numbering the beats visually within the image is encouraged.

Output: A single high-resolution Board/Map image.
`.trim()

      // 2. Generate Image (Gemini / Nano Banana)
      // Hardcoded model per user request
      const targetModel = 'gemini-3-pro-image-preview'

      logger.info('Generating combined image with Nano Banana (Gemini)', { model: targetModel })

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              // Gemini Image Gen doesn't expose resolution params directly in standard API, usually 1024x1024.
              // For 16:9, Gemini might return square and we crop, or it might respect "aspect ratio" if the model supports it via prompt.
              // We will ask for 16:9 in prompt.
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

      // 3. Save to Disk
      await metadata.set('stage', 'saving_image')

      const filename = `combined_storyboard_${episodeId}_${Date.now()}.png`
      const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }

      const buffer = Buffer.from(imageBase64, 'base64')
      fs.writeFileSync(path.join(projectDir, filename), buffer)
      logger.info('Combined image saved to disk', { filename })

      // 4. Update Database
      // The user wants "Combined Storyboard" to be saved as 'storyboard_url'.
      // The frontend reads from 'episodes' table, 'story_plan' JSONB column.
      // So we must update the 'story_plan' JSONB in the 'episodes' table.

      await metadata.set('stage', 'updating_database')

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Fetch current story_plan from events
      const { data: episodeData, error: fetchError } = await supabase
        .from('episodes')
        .select('story_plan')
        .eq('id', episodeId)
        .single()

      if (fetchError || !episodeData) {
        logger.error(`Failed to fetch episode for update: ${fetchError?.message}`)
        // Proceeding might overwrite with empty plan or fail?
        // Depending on how crucial peristence is. But we return the URL anyway.
      } else {
        const currentPlan = episodeData.story_plan || {}

        // Merge new storyboard fields
        const updatedPlan = {
          ...currentPlan,
          storyboardUrl: filename,
          storyboardPrompt: prompt,
          // We DO NOT touch posterUrl here as that is for Midjourney now
        }

        const { error: updateError } = await supabase
          .from('episodes')
          .update({
            story_plan: updatedPlan,
          })
          .eq('id', episodeId)

        if (updateError) {
          logger.error(`Failed to update episode story_plan: ${updateError.message}`)
        } else {
          logger.info('Episode story_plan updated with storyboardUrl')
        }
      }

      logger.info('Combined storyboard generation completed successfully', { episodeId, filename })

      return {
        success: true,
        episodeId,
        imageUrl: filename,
        fullUrl: `/projects/${projectId}/${filename}`,
      }
    } catch (error: unknown) {
      logger.error('Combined storyboard generation failed', { error: getErrorMessage(error) })
      throw error
    }
  },
})
