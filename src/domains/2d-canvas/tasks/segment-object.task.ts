import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { runSegmentObject, segmentObjectPayloadSchema } from './segment-object-run'

export const segmentObjectTask = defineOwnedTask({
  id: TRIGGER_TASK_ID.SEGMENT_OBJECT,
  schema: segmentObjectPayloadSchema,
  queue: JobQueue.Fal,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
  },
  run: async payload => runSegmentObject(payload),
})
