import { task } from '@trigger.dev/sdk/v3'
import { runEnhanceFidelity, type EnhanceFidelityPayload } from './enhance-fidelity-run'

export const enhanceFidelityTask = task({
  id: 'enhance-fidelity',
  maxDuration: 1200,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: EnhanceFidelityPayload) => runEnhanceFidelity(payload),
})
