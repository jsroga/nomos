import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { BufferEncoding, FsDirectory } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'
import { resolveEpisodePosterModel } from '@/shared/ai/image-model-env'

interface GenerateEpisodePosterPayload {
  episodeId: string
  projectId: string
  prompt: string
  providerConfig: {
    provider: typeof ImageGenProvider.NanoBanana
    apiKey: string
    modelId?: string
  }
}

export const generateEpisodePoster = task({
  id: 'generate-episode-poster',
  maxDuration: 300,
  run: async (payload: GenerateEpisodePosterPayload) => {
    const { episodeId, projectId, prompt, providerConfig } = payload
    const { apiKey, modelId = resolveEpisodePosterModel() } = providerConfig

    logger.info(`Starting episode poster generation for episode ${episodeId}`, { prompt })

    await metadata.set('episode_id', episodeId)
    await metadata.set('project_id', projectId)
    await metadata.set('progress', 0)

    try {
      await metadata.set('stage', 'generating_image')
      const enhancedPrompt = `${prompt}. Movie poster style, cinematic composition, dramatic lighting, high resolution, highly detailed, vertical aspect ratio.`

      logger.info('Generating episode poster via Apiframe Nano Banana')
      const imageBase64 = await generateNanoBananaBase64({
        prompt: enhancedPrompt,
        apiKey,
        modelId,
        aspectRatio: '2:3',
      })

      await metadata.set('stage', 'saving_image')
      await metadata.set('progress', 50)

      const filename = `episode_poster_${episodeId}_${Date.now()}.png`
      const projectDir = path.join(
        process.cwd(),
        FsDirectory.Public,
        FsDirectory.Projects,
        projectId,
      )

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true })
      }

      fs.writeFileSync(
        path.join(projectDir, filename),
        Buffer.from(imageBase64, BufferEncoding.Base64),
      )
      logger.info('Image saved to disk', { filename })

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
