import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { repaintTilePayloadSchema, runRepaintTile } from './repaint-tile-run'

export const repaintTileTask = defineOwnedTask({
  id: TRIGGER_TASK_ID.REPAINT_TILE,
  schema: repaintTilePayloadSchema,
  queue: JobQueue.ImageProvider,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
  },
  run: async payload => runRepaintTile(payload),
})
