import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { POLLING_INTERVALS, isActiveTaskStatus } from '@/shared/data/constants/polling'
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

interface FidelityRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  startedAt: string
}

export class FidelityService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Cleanup all polling intervals - call on unmount to prevent memory leaks
   */
  cleanup() {
    for (const [, timeout] of this.pollingIntervals) {
      clearTimeout(timeout)
    }
    this.pollingIntervals.clear()
  }

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
      this.startPolling(runState, opId)

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
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   */
  private startPolling(runState: FidelityRunState, opId: string) {
    let consecutiveErrors = 0
    let lastProgress = 0
    let stableProgressCount = 0

    const poll = async () => {
      try {
        const statusData = await fetchFidelityRunStatus(runState.runId)

        if (statusData.statusCode === 404) {
          consecutiveErrors++
          if (consecutiveErrors > 5) {
            console.warn(FidelityServiceLog.RunNotFoundAfterRetries)
            useWorldStore
              .getState()
              .setTileError(runState.tileX, runState.tileY, FidelityServiceError.TaskNotFound)
            this.clearRunState(runState, opId)
            return
          }
          this.scheduleNextPoll(runState.runId, poll, 2000)
          return
        }

        consecutiveErrors = 0
        const progress =
          typeof statusData.metadata?.progress === 'number' ? statusData.metadata.progress : 0
        const stage =
          (typeof statusData.metadata?.stage === 'string'
            ? statusData.metadata.stage
            : null) ?? TileProgressStage.Unknown

        if (progress === lastProgress) {
          stableProgressCount++
        } else {
          stableProgressCount = 0
          lastProgress = progress
        }

        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
        })

        if (statusData.status === TriggerTerminalStatus.Completed) {
          console.log(FidelityServiceLog.EnhancementCompleted, statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        if (!statusData.status || !isActiveTaskStatus(statusData.status)) {
          const errorMsg =
            (typeof statusData.error === 'string' ? statusData.error : null) ||
            `${FidelityServiceError.EnhancementFailed} (${statusData.status ?? 'unknown'})`
          console.error(FidelityServiceLog.EnhancementFailed, errorMsg)
          useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
          this.clearRunState(runState, opId)
          return
        }

        let nextInterval: number = POLLING_INTERVALS.DEFAULT
        if (stableProgressCount === 0) {
          nextInterval = 2000
        } else if (stableProgressCount < 3) {
          nextInterval = POLLING_INTERVALS.DEFAULT
        } else {
          nextInterval = POLLING_INTERVALS.SLOW
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error(FidelityServiceLog.StatusPollingError, error)
        consecutiveErrors++
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    poll()
  }

  private scheduleNextPoll(runId: string, pollFn: () => Promise<void>, interval: number) {
    const existingTimeout = this.pollingIntervals.get(runId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    const timeoutId = setTimeout(pollFn, interval)
    this.pollingIntervals.set(runId, timeoutId)
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
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    browserStorage.remove(DynamicLocalStorageKeys.fidelityRun(runState.tileId))

    // Clear UI status
    useWorldStore.getState().removeEnhancingTile(runState.tileX, runState.tileY)
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
          const opId = `${FidelityOperationIdPrefix.Fidelity}${runState.tileX}-${runState.tileY}`
          useGlobalStatusStore.getState().addOperation({
            id: opId,
            type: OperationTypeId.WorldGen,
            label: FidelityOperationLabel.EnhancingFidelityResumed,
            details: `(${runState.tileX}, ${runState.tileY})`,
            status: AsyncOperationStatus.InProgress,
          })

          this.startPolling(runState, opId)
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
