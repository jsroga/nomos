import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { FsDirectory } from '@/shared/data/constants/protocol'
import { generateApiframeSurfaceImage } from '@/shared/ai/generate-apiframe-surface-image'
import {
  ApiframeGenerateAspectRatio,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import { resolveEpisodePosterModel } from '@/shared/ai/image-model-env'

enum PosterPrompt {
  Midjourney = 'movie poster for ',
  MidjourneySuffix = ', cinematic lighting, high resolution, detailed, textless',
  GenericSuffix = '. Movie poster style, cinematic composition, dramatic lighting, high resolution, highly detailed, vertical aspect ratio.',
}

interface GenerateEpisodePosterPayload {
  episodeId: string
  projectId: string
  prompt: string
  providerConfig: {
    apiKey: string
    modelId?: string
  }
}

function posterPromptForModel(prompt: string, model: ApiframeImageModel): string {
  if (model === ApiframeImageModel.Midjourney) {
    return `${PosterPrompt.Midjourney}${prompt}${PosterPrompt.MidjourneySuffix}`
  }
  return `${prompt}${PosterPrompt.GenericSuffix}`
}

export const generateEpisodePoster = task({
  id: 'generate-episode-poster',
  maxDuration: 300,
  run: async (payload: GenerateEpisodePosterPayload) => {
    const { episodeId, projectId, prompt, providerConfig } = payload
    const { apiKey } = providerConfig
    const model = resolveEpisodePosterModel()

    logger.info(`Starting episode poster generation for episode ${episodeId}`, { prompt })

    await metadata.set('episode_id', episodeId)
    await metadata.set('project_id', projectId)
    await metadata.set('progress', 0)

    try {
      await metadata.set('stage', 'generating_image')
      const enhancedPrompt = posterPromptForModel(prompt, model)

      const generated = await generateApiframeSurfaceImage({
        model,
        prompt: enhancedPrompt,
        apiKey,
        aspectRatio: ApiframeGenerateAspectRatio.PortraitTwoThree,
      })

      await metadata.set('stage', 'saving_image')
      await metadata.set('progress', 50)

      const imgResponse = await fetch(generated.imageUrl)
      if (!imgResponse.ok) {
        throw new Error(`Failed to download image from URL: ${imgResponse.status}`)
      }

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
        Buffer.from(await imgResponse.arrayBuffer()),
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
        isVariantGrid: generated.isVariantGrid,
        jobId: generated.jobId,
      }
    } catch (error: unknown) {
      logger.error('Poster generation failed', { error: getErrorMessage(error) })
      throw error
    }
  },
})
