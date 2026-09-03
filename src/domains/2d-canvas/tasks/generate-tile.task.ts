import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { generateTilePayloadSchema } from './constants/generate-tile'
import { runWithTileProgress } from './constants/generate-tile-progress'
import { runGenerateTile } from './generate-tile-run'

export const generateTileTask = defineOwnedTask({
  id: 'generate-tile',
  schema: generateTilePayloadSchema,
  queue: JobQueue.ImageProvider,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
  },
  run: async payload => runWithTileProgress(() => runGenerateTile(payload)),
})
