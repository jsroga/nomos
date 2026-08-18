import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  waitForTriggerRun,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
import { TILE_COORD_SEPARATOR } from '../../ui/constants/tile-stage-labels'
import {
  fetchFidelityRunStatus,
  triggerFidelityEnhancement,
} from '../../core/io/world-gen-trigger.api'
import { fetchUrlAsBase64 } from '../../core/io/world-data.api'
import {
  AsyncOperationStatus,
  DynamicLocalStoragePrefix,
  FidelityOperationDetailSuffix,
  FidelityOperationIdPrefix,
  FidelityOperationLabel,
  FidelityServiceError,
  FidelityServiceLog,
  OperationTypeId,
  TileProgressStage,
  TriggerTerminalStatus,
  UrlScheme,
  WorldGenReviewType,
} from '../../constants/fidelity-service'
import { getWorldUiStore } from '../useWorldUiStore'

const TRIGGER_RUN_NOT_FOUND_STATUS = 'NOT_FOUND'
const UNKNOWN_STATUS_LABEL = 'unknown'

interface FidelityRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  startedAt: string
}

export class FidelityService {
  /**
   * Cleanup hook retained for API compatibility (polling is promise-based).
   */
  cleanup() {}

  /**
   * Enhance tile fidelity using Gemini with a style prompt
   */
  async enhance(
    tile: Tile,
    stylePrompt: string,
    creativity: number,
    styleReferenceUrls?: string[]
  ): Promise<string | null> {
    console.log(FidelityServiceLog.StartingViaTrigger, tile.id, {
      creativity,
      styleReferenceUrls,
    })

    // Track enhancing status
    useWorldStore.getState().addEnhancingTile(tile.x, tile.y)
    useWorldStore.getState().setTileProgress(tile.x, tile.y, 0, TileProgressStage.Initializing)
    const opId = `${FidelityOperationIdPrefix.Fidelity}${tile.x}-${tile.y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: OperationTypeId.WorldGen,
      label: FidelityOperationLabel.EnhancingFidelity,
      details: `(${tile.x}, ${tile.y})`,
      status: AsyncOperationStatus.InProgress,
    })

    try {
      if (!tile.image_filename) {
        throw new Error(FidelityServiceError.TileHasNoImage)
      }
      let imageUrl = tile.image_filename
      if (!imageUrl.startsWith(UrlScheme.Http)) {
        imageUrl = `/projects/${tile.project_id}/${tile.image_filename}`
      }

      const base64 = await fetchUrlAsBase64(imageUrl)

      console.log(FidelityServiceLog.TriggeringTask)

      const { runId } = await triggerFidelityEnhancement({
        tileId: tile.id,
        projectId: tile.project_id,
        imageBase64: base64,
        stylePrompt,
        creativity,
        ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
      })

      console.log(FidelityServiceLog.TaskTriggered, runId)

      // 3. Save run state to localStorage for recovery
      const runState: FidelityRunState = {
        runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        startedAt: new Date().toISOString(),
      }

      browserStorage.setObject(DynamicLocalStorageKeys.fidelityRun(tile.id), runState)

      // 4. Start polling for status
      void this.pollRun(runState, opId)

      return runId
    } catch (error) {
      console.error(FidelityServiceLog.EnhancementError, error)
      // Clean up status on error
      useWorldStore
        .getState()
        .setTileError(
          tile.x,
          tile.y,
          error instanceof Error ? error.message : FidelityServiceError.EnhancementFailed
        )
      useWorldStore.getState().removeEnhancingTile(tile.x, tile.y)
      useWorldStore.getState().clearTileProgress(tile.x, tile.y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  private async pollRun(runState: FidelityRunState, opId: string) {
    try {
      const result = await waitForTriggerRun(
        createTriggerRunStatusFetch(fetchFidelityRunStatus, runState.runId),
        {
          intervalMs: POLLING_INTERVALS.DEFAULT,
          maxPolls: 120,
          onPoll: data => {
            const metadata = recordFromJson(data.metadata)
            const progress = typeof metadata.progress === 'number' ? metadata.progress : 0
            const stage = readString(metadata.stage) ?? TileProgressStage.Unknown
            useGlobalStatusStore.getState().updateOperation(opId, {
              details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
            })
            useWorldStore.getState().setTileProgress(runState.tileX, runState.tileY, progress, stage)
          },
        }
      )

      if (result.status === TriggerTerminalStatus.Completed) {
        console.log(FidelityServiceLog.EnhancementCompleted, result.output)
        await this.handleCompletion(runState, result.output, opId)
      }
    } catch (error) {
      if (error instanceof TriggerRunPollFailedError) {
        const errorMsg =
          (typeof error.runError === 'string' ? error.runError : null) ||
          (error.status === TRIGGER_RUN_NOT_FOUND_STATUS
            ? FidelityServiceError.TaskNotFound
            : `${FidelityServiceError.EnhancementFailed} (${error.status ?? UNKNOWN_STATUS_LABEL})`)
        console.error(FidelityServiceLog.EnhancementFailed, errorMsg)
        useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
      } else {
        console.error(FidelityServiceLog.StatusPollingError, error)
      }
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: FidelityRunState,
    output: Record<string, unknown> | undefined,
    opId: string
  ) {
    const out = recordFromJson(output)
    try {
      const pendingReview = out.pendingReview === true
      const enhancedUrl = readString(out.enhancedUrl)
      const originalUrl = readString(out.originalUrl) ?? ''

      // Check if fidelity enhancement requires user review (new flow)
      if (pendingReview && enhancedUrl) {
        console.log(FidelityServiceLog.CompletedWithSupabaseUrl, {
          enhancedUrl,
          originalUrl,
        })

        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX}${TILE_COORD_SEPARATOR}${runState.tileY}`]
        const resolvedOriginalUrl = existingTile?.image_filename
          ? (existingTile.image_filename.startsWith(UrlScheme.Http)
              ? existingTile.image_filename
              : `/projects/${runState.projectId}/${existingTile.image_filename}`)
          : originalUrl

        useWorldStore.getState().setPendingFidelity(runState.tileX, runState.tileY, {
          newUrl: enhancedUrl,
          newBase64: readString(out.enhancedBase64) ?? '',
          originalUrl: resolvedOriginalUrl,
        })

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: AsyncOperationStatus.Completed,
          details: `(${runState.tileX}, ${runState.tileY})${FidelityOperationDetailSuffix.ReviewEnhancement}`,
        })

        // Notify UI to show review dialog
        if (typeof window !== 'undefined') {
          getWorldUiStore().enqueueReviewRequest({
            type: WorldGenReviewType.Fidelity,
            tileX: runState.tileX,
            tileY: runState.tileY,
            newUrl: enhancedUrl,
            originalUrl: resolvedOriginalUrl,
          })
        }

        this.clearRunState(runState, opId)
        return
      }

      // Legacy flow - direct update (shouldn't happen anymore)
      const filename = readString(out.filename)
      if (out.success === true && filename) {
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.tileX}${TILE_COORD_SEPARATOR}${runState.tileY}`

        if (tiles[tileKey]) {
          useWorldStore.setState({
            tiles: {
              ...tiles,
              [tileKey]: { ...tiles[tileKey], image_filename: filename },
            },
          })
        }

        console.log(FidelityServiceLog.TileUpdatedWithEnhancedImage, filename)
      }
    } catch (error) {
      console.error(FidelityServiceLog.ErrorUpdatingTileAfterCompletion, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: FidelityRunState, opId: string) {
    browserStorage.remove(DynamicLocalStorageKeys.fidelityRun(runState.tileId))

    // Clear UI status
    useWorldStore.getState().removeEnhancingTile(runState.tileX, runState.tileY)
    useWorldStore.getState().clearTileProgress(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending fidelity enhancement tasks from localStorage (call on app load)
   */
  resumePendingEnhancements() {
    browserStorage.forEachPrefixed(DynamicLocalStoragePrefix.FidelityRun, (key, raw) => {
      try {
        const runState: FidelityRunState = JSON.parse(raw)
        if (runState.runId) {
          console.log(FidelityServiceLog.ResumingPolling, runState.runId)

          useWorldStore.getState().addEnhancingTile(runState.tileX, runState.tileY)
          useWorldStore.getState().setTileProgress(
            runState.tileX,
            runState.tileY,
            0,
            TileProgressStage.Initializing,
          )
          const opId = `${FidelityOperationIdPrefix.Fidelity}${runState.tileX}-${runState.tileY}`
          useGlobalStatusStore.getState().addOperation({
            id: opId,
            type: OperationTypeId.WorldGen,
            label: FidelityOperationLabel.EnhancingFidelityResumed,
            details: `(${runState.tileX}, ${runState.tileY})`,
            status: AsyncOperationStatus.InProgress,
          })

          void this.pollRun(runState, opId)
        }
      } catch {
        console.warn(FidelityServiceLog.FailedToParseRunState, key)
        browserStorage.remove(key)
      }
    })
  }

  /**
   * Stop an in-progress fidelity enhancement
   */
  stopEnhancement(tileId: string) {
    const key = DynamicLocalStorageKeys.fidelityRun(tileId)
    const data = browserStorage.getString(key)
    if (data) {
      try {
        const runState: FidelityRunState = JSON.parse(data)
        const opId = `${FidelityOperationIdPrefix.Fidelity}${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log(FidelityServiceLog.StoppedForTile, tileId)
      } catch {
        browserStorage.remove(key)
      }
    }
  }
}

export const fidelityService = new FidelityService()
