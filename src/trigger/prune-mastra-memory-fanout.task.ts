import { JobQueue, defineScheduledTask, newSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import {
  fanOutPruneMastraMemory,
  PruneMastraMemoryCron,
  PruneMastraMemoryScheduleId,
} from '@/shared/agent-kernel/mastra/prune-mastra-memory'
import {
  PRUNE_MASTRA_MEMORY_TASK_ID,
  listStorytellerMemoryProjectIds,
} from '@/trigger/prune-mastra-memory.task'

export const pruneMastraMemoryFanoutTask = defineScheduledTask({
  id: PruneMastraMemoryScheduleId.Fanout,
  cron: PruneMastraMemoryCron.DailyUtc,
  queue: JobQueue.Storage,
  maxDuration: 300,
  run: () =>
    fanOutPruneMastraMemory({
      listProjectIds: listStorytellerMemoryProjectIds,
      mintNonce: newSubmissionNonce,
      triggerPrune: (projectId, requestId) =>
        triggerOwnedRun(PRUNE_MASTRA_MEMORY_TASK_ID, { projectId, requestId }),
    }),
})
