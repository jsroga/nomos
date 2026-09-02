import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { enhanceFidelityPayloadSchema, runEnhanceFidelity } from './enhance-fidelity-run'

export const enhanceFidelityTask = defineOwnedTask({
  id: 'enhance-fidelity',
  schema: enhanceFidelityPayloadSchema,
  queue: JobQueue.Apiframe,
  maxDuration: 1200,
  retry: {
    maxAttempts: 2,
  },
  run: async payload => runEnhanceFidelity(payload),
})
