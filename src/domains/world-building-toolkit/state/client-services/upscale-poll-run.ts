import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  waitForTriggerRun,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { fetchUpscaleRunStatus } from '../../core/io/world-gen-trigger.api'
import {
  TileProgressStage,
  TriggerTerminalStatus,
  UpscaleServiceError,
  UpscaleServiceLog,
} from '../../constants/upscale-service'
import { handleUpscaleCompletion } from './upscale-completion'
import {
  clearUpscaleRunState,
  handleUpscalePollError,
  updateUpscalePollStatus,
} from './upscale-run-status'
import type { UpscaleRunState } from './upscale-run-types'

const TRIGGER_RUN_NOT_FOUND_STATUS = 'NOT_FOUND'
const UNKNOWN_STATUS_LABEL = 'unknown'

export async function pollUpscaleRun(runState: UpscaleRunState, opId: string): Promise<void> {
  try {
    const result = await waitForTriggerRun(
      createTriggerRunStatusFetch(fetchUpscaleRunStatus, runState.runId),
      {
        intervalMs: POLLING_INTERVALS.DEFAULT,
        maxPolls: 120,
        onPoll: data => {
          const metadata = recordFromJson(data.metadata)
          const progress = typeof metadata.progress === 'number' ? metadata.progress : 0
          const stage = readString(metadata.stage) ?? TileProgressStage.Unknown
          updateUpscalePollStatus(opId, runState.tileX, runState.tileY, stage, progress)
        },
      }
    )

    if (result.status === TriggerTerminalStatus.Completed) {
      console.log(UpscaleServiceLog.UpscaleCompleted, result.output)
      await handleUpscaleCompletion(runState, result.output, opId)
    }
  } catch (error) {
    if (error instanceof TriggerRunPollFailedError) {
      const errorMsg =
        (typeof error.runError === 'string' ? error.runError : null) ||
        (error.status === TRIGGER_RUN_NOT_FOUND_STATUS
          ? UpscaleServiceError.TaskNotFound
          : `${UpscaleServiceError.UpscaleFailed} (${error.status ?? UNKNOWN_STATUS_LABEL})`)
      console.error(UpscaleServiceLog.UpscaleFailed, errorMsg)
      handleUpscalePollError(runState, errorMsg)
    } else {
      console.error(UpscaleServiceLog.StatusPollingError, error)
    }
    clearUpscaleRunState(runState, opId)
  }
}
