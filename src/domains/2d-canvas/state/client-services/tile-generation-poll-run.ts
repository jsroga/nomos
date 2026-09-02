import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  waitForTriggerRun,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
import { recordFromJson, readString, stringArrayFromJson } from '@/shared/data/json-guards'
import { fetchTileGenerationRunStatus } from '../../core/io/world-gen-trigger.api'
import {
  TileGenerationServiceError,
  TileGenerationServiceLog,
  TileProgressStage,
  TriggerTerminalStatus,
  WorldGenReviewType,
} from '../../constants/tile-generation-service'
import { getWorldUiStore } from '../useWorldUiStore'
import { handleTileGenCompletion } from './tile-generation-completion'
import {
  clearTileGenRunState,
  handleTileGenPollError,
  updateTileGenPollStatus,
} from './tile-generation-run-status'
import type { TileGenRunState } from './tile-generation-run-types'

const TRIGGER_RUN_NOT_FOUND_STATUS = 'NOT_FOUND'
const UNKNOWN_STATUS_LABEL = 'unknown'

export async function pollTileGenRun(runState: TileGenRunState, opId: string): Promise<void> {
  let variantSelectionDispatched = false

  try {
    const result = await waitForTriggerRun(
      createTriggerRunStatusFetch(fetchTileGenerationRunStatus, runState.runId),
      {
        intervalMs: POLLING_INTERVALS.DEFAULT,
        maxPolls: 120,
        onPoll: data => {
          const metadata = recordFromJson(data.metadata)
          const progress = typeof metadata.progress === 'number' ? metadata.progress : 0
          const stage = readString(metadata.stage) ?? TileProgressStage.Unknown

          updateTileGenPollStatus(opId, runState.x, runState.y, stage, progress)

          const variantUrls = stringArrayFromJson(metadata.variantUrls)
            .map(item => readString(item))
            .filter((url): url is string => Boolean(url))
          const waitTokenId = readString(metadata.waitTokenId)

          if (
            !variantSelectionDispatched &&
            stage === TileProgressStage.WaitingVariantSelection &&
            variantUrls.length > 0 &&
            waitTokenId
          ) {
            variantSelectionDispatched = true
            if (typeof window !== 'undefined') {
              getWorldUiStore().enqueueReviewRequest({
                type: WorldGenReviewType.Generation,
                tileX: runState.x,
                tileY: runState.y,
                newUrl: variantUrls[0] ?? '',
                variantUrls,
                tokenId: waitTokenId,
                runId: runState.runId,
              })
            }
          }
        },
      }
    )

    if (result.status === TriggerTerminalStatus.Completed) {
      console.log(TileGenerationServiceLog.GenerationCompleted, result.output)
      await handleTileGenCompletion(runState, result.output, opId)
    }
  } catch (error) {
    if (error instanceof TriggerRunPollFailedError) {
      const errorMsg =
        (typeof error.runError === 'string' ? error.runError : null) ||
        (error.status === TRIGGER_RUN_NOT_FOUND_STATUS
          ? TileGenerationServiceError.TaskNotFound
          : `${TileGenerationServiceError.GenerationFailed} (${error.status ?? UNKNOWN_STATUS_LABEL})`)
      console.error(TileGenerationServiceLog.GenerationFailed, errorMsg)
      handleTileGenPollError(runState, errorMsg)
    } else {
      console.error(TileGenerationServiceLog.StatusPollingError, error)
    }
    clearTileGenRunState(runState, opId)
  }
}
