import { task } from '@trigger.dev/sdk/v3'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { runStoryboardGeneration } from './run-storyboard-generation'

interface GenerateStoryboardPayload {
  beatId: string
  projectId: string
  prompt: string
  providerConfig: {
    provider: 'nanobanana'
    apiKey: string
    modelId?: string
  }
}

export const generateStoryboard = task({
  id: 'generate-storyboard',
  maxDuration: 300,
  run: async (payload: GenerateStoryboardPayload) => {
    try {
      return await runStoryboardGeneration(payload)
    } catch (error: unknown) {
      const { logger } = await import('@trigger.dev/sdk/v3')
      logger.error('Storyboard generation failed', { error: getErrorMessage(error) })
      throw error
    }
  },
})
