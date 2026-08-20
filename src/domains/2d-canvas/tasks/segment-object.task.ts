import { task } from '@trigger.dev/sdk/v3'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { runSegmentObject, type SegmentObjectPayload } from './segment-object-run'

export const segmentObjectTask = task({
  id: TRIGGER_TASK_ID.SEGMENT_OBJECT,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: SegmentObjectPayload) => runSegmentObject(payload),
})
