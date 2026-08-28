import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { runStoryboardGeneration } from './run-storyboard-generation'
import { generateStoryboardPayloadSchema } from './constants/task-payloads'

export const generateStoryboard = defineOwnedTask({
  id: 'generate-storyboard',
  schema: generateStoryboardPayloadSchema,
  queue: JobQueue.ImageProvider,
  maxDuration: 300,
  run: async payload => {
    try {
      return await runStoryboardGeneration(payload)
    } catch (error: unknown) {
      const { logger } = await import('@trigger.dev/sdk/v3')
      logger.error('Storyboard generation failed', { error: getErrorMessage(error) })
      throw error
    }
  },
})
