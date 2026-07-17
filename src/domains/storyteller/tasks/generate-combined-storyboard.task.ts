import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  buildCombinedStoryboardPrompt,
  fetchGeminiStoryboardImage,
  persistEpisodeStoryboardUrl,
  saveStoryboardImage,
} from './generate-combined-storyboard-helpers'

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
  maxDuration: 600,
  run: async (payload: GenerateCombinedStoryboardPayload) => {
    const { episodeId, projectId, beats, providerConfig } = payload
    const { apiKey } = providerConfig

    logger.info(
      `Starting combined storyboard generation for episode ${episodeId} with ${beats.length} beats.`
    )

    await metadata.set('episode_id', episodeId)
    await metadata.set('project_id', projectId)
    await metadata.set('stage', 'prompting')

    try {
      const prompt = buildCombinedStoryboardPrompt(beats)
      const imageBase64 = await fetchGeminiStoryboardImage(apiKey, prompt)

      await metadata.set('stage', 'saving_image')
      const filename = saveStoryboardImage(projectId, episodeId, imageBase64)

      await metadata.set('stage', 'updating_database')
      await persistEpisodeStoryboardUrl(episodeId, filename, prompt)

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
