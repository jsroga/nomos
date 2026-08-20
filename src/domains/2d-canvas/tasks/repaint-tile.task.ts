import { task } from '@trigger.dev/sdk/v3'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { runRepaintTile, type RepaintTilePayload } from './repaint-tile-run'

export const repaintTileTask = task({
  id: TRIGGER_TASK_ID.REPAINT_TILE,
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: RepaintTilePayload) => runRepaintTile(payload),
})
