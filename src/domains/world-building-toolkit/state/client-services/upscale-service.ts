import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS, isActiveTaskStatus } from '@/shared/data/constants/polling'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import {
  fetchUpscaleRunStatus,
  triggerUpscale,
  triggerUpscaleVariantSelection,
} from '../../core/io/world-gen-trigger.api'
import { fetchUrlAsBase64 } from '../../core/io/world-data.api'
import {
  parseUpscaleProvider,
  UpscaleProvider,
} from '../../core/upscale-provider-wire'
import {
  AsyncOperationStatus,
  BooleanQueryValue,
  DynamicLocalStoragePrefix,
  OperationTypeId,
  TriggerTerminalStatus,
  TileProgressStage,
  UpscaleOperationDetailSuffix,
  UpscaleOperationIdPrefix,
  UpscaleOperationLabel,
  UpscaleServiceError,
  UpscaleServiceLog,
  UrlScheme,
  WorldGenReviewType,
} from '../../constants/upscale-service'
import { getWorldUiStore } from '../useWorldUiStore'

interface UpscaleRunState {
  runId: string
  tileId: string
  tileX: number
  tileY: number
  projectId: string
  provider: UpscaleProvider
  startedAt: string
}

interface MjGridStoragePayload {
  gridImageUrl: string
  taskId: string
  buttons: unknown[]
  tileId: string
  projectId: string
  runState?: UpscaleRunState
}

export class UpscaleService {
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
   * Start upscaling a tile using Trigger.dev background task
   */
  async upscale(
    tile: Tile,
    creativity: number,
    styleReferenceUrls?: string[],
    provider?: UpscaleProvider
  ): Promise<string | null> {
    console.log(UpscaleServiceLog.StartingViaTrigger, tile.id, UpscaleServiceLog.Creativity, creativity, {
      styleReferenceUrls,
    })

    const activeUpscaler: UpscaleProvider =
      provider ?? parseUpscaleProvider(browserStorage.getString(LocalStorageKeys.AI_ACTIVE_UPSCALER))

    const skipGeminiPreUpscale =
      browserStorage.getString(LocalStorageKeys.SKIP_GEMINI_PRE_UPSCALE) === BooleanQueryValue.True

    // Track upscaling status
    useWorldStore.getState().addUpscalingTile(tile.x, tile.y)
    const opId = `${UpscaleOperationIdPrefix.Upscale}${tile.x}-${tile.y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: OperationTypeId.WorldGen,
      label: UpscaleOperationLabel.UpscalingTile,
      details: `(${tile.x}, ${tile.y}) via ${activeUpscaler}`,
      status: AsyncOperationStatus.InProgress,
    })

    try {
      if (!tile.image_filename) {
        throw new Error(UpscaleServiceError.TileHasNoImage)
      }
      const imageUrl = tile.image_filename.startsWith(UrlScheme.Http)
        ? tile.image_filename
        : `/projects/${tile.project_id}/${tile.image_filename}`
      const base64 = await fetchUrlAsBase64(imageUrl)

      console.log(`${UpscaleServiceLog.TriggeringTask} ${activeUpscaler}`)

      const { runId } = await triggerUpscale({
        tileId: tile.id,
        projectId: tile.project_id,
        imageBase64: base64,
        prompt: tile.tile_prompt ?? '',
        creativity,
        provider: activeUpscaler,
        skipGeminiPreUpscale,
        ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
      })

      console.log(UpscaleServiceLog.TaskTriggered, runId)

      // 3. Save run state to localStorage for recovery
      const runState: UpscaleRunState = {
        runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        provider: activeUpscaler,
        startedAt: new Date().toISOString(),
      }

      browserStorage.setObject(DynamicLocalStorageKeys.upscaleRun(tile.id), runState)

      // 4. Start polling for status
      this.startPolling(runState, opId)

      return runId
    } catch (error) {
      console.error(UpscaleServiceLog.UpscaleError, error)
      // Clean up status on error
      useWorldStore.getState().setTileError(
        tile.x,
        tile.y,
        error instanceof Error ? error.message : UpscaleServiceError.UpscaleFailed
      )
      useWorldStore.getState().removeUpscalingTile(tile.x, tile.y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   * Uses shorter intervals during active processing, longer intervals when idle
   */
  private startPolling(runState: UpscaleRunState, opId: string) {
    let consecutiveErrors = 0
    let lastProgress = 0
    let stableProgressCount = 0

    const poll = async () => {
      try {
        const statusData = await fetchUpscaleRunStatus(runState.runId)

        if (statusData.statusCode === 404) {
          consecutiveErrors++
          if (consecutiveErrors > 5) {
            console.warn(UpscaleServiceLog.RunNotFoundAfterRetries)
            useWorldStore.getState().setTileError(runState.tileX, runState.tileY, UpscaleServiceError.TaskNotFound)
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

        // Track progress changes for adaptive polling
        if (progress === lastProgress) {
          stableProgressCount++
        } else {
          stableProgressCount = 0
          lastProgress = progress
        }

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
        })

        // Check if completed
        if (statusData.status === TriggerTerminalStatus.Completed) {
          console.log(UpscaleServiceLog.UpscaleCompleted, statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!statusData.status || !isActiveTaskStatus(statusData.status)) {
          const errorMsg =
            (typeof statusData.error === 'string' ? statusData.error : null) ||
            `${UpscaleServiceError.UpscaleFailed} (${statusData.status ?? 'unknown'})`
          console.error(UpscaleServiceLog.UpscaleFailed, errorMsg)
          useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
          this.clearRunState(runState, opId)
          return
        }

        // Adaptive polling interval
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
        console.error(UpscaleServiceLog.StatusPollingError, error)
        consecutiveErrors++
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    poll()
  }

  /**
   * Schedule next poll with cleanup tracking
   */
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
    runState: UpscaleRunState,
    output: Record<string, unknown> | undefined,
    opId: string
  ) {
    const out = recordFromJson(output)
    try {
      const upscaledUrl = readString(out.upscaledUrl)
      if (out.pendingReview === true && upscaledUrl) {
        console.log(UpscaleServiceLog.CompletedWithSupabaseUrls, {
          upscaledUrl,
          originalUrl: readString(out.originalUrl),
          filename: readString(out.filename),
        })

        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX},${runState.tileY}`]
        const originalUrl = existingTile?.image_filename
          ? (existingTile.image_filename.startsWith(UrlScheme.Http)
              ? existingTile.image_filename
              : `/projects/${runState.projectId}/${existingTile.image_filename}`)
          : (readString(out.originalUrl) ?? '')

        useWorldStore
          .getState()
          .setPendingUpscale(runState.tileX, runState.tileY, upscaledUrl, originalUrl)

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: AsyncOperationStatus.Completed,
          details: `(${runState.tileX}, ${runState.tileY})${UpscaleOperationDetailSuffix.ReviewUpscale}`,
        })

        // Notify UI to show review dialog
        if (typeof window !== 'undefined') {
          getWorldUiStore().enqueueReviewRequest({
            type: WorldGenReviewType.Upscale,
            tileX: runState.tileX,
            tileY: runState.tileY,
            newUrl: upscaledUrl,
            originalUrl,
          })
        }

        this.clearRunState(runState, opId)
        return
      }

      // Check if MJ returned a grid requiring variant selection
      if (out.requiresVariantSelection === true) {
        console.log(UpscaleServiceLog.MjGridReceived, out)

        browserStorage.setObject(DynamicLocalStorageKeys.mjGrid(runState.tileId), {
          gridImageUrl: readString(out.gridImageUrl),
          taskId: readString(out.taskId),
          buttons: out.buttons,
          tileId: readString(out.tileId),
          projectId: readString(out.projectId),
          runState,
        })

        // Update global status to show variant selection is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: AsyncOperationStatus.Completed,
          details: `(${runState.tileX}, ${runState.tileY})${UpscaleOperationDetailSuffix.SelectVariant}`,
        })

        // Don't clear run state - keep it for variant selection
        // But stop polling
        const interval = this.pollingIntervals.get(runState.runId)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(runState.runId)
        }

        // Notify UI to show variant picker
        const gridImageUrl = readString(out.gridImageUrl)
        const taskId = readString(out.taskId)
        if (typeof window !== 'undefined' && gridImageUrl && taskId) {
          getWorldUiStore().notifyMjGridReady({
            tileId: runState.tileId,
            tileX: runState.tileX,
            tileY: runState.tileY,
            gridImageUrl,
            buttons: Array.isArray(out.buttons) ? out.buttons : [],
            taskId,
          })
        }
        return
      }

      const filename = readString(out.filename)
      if (out.success === true && filename) {
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.tileX},${runState.tileY}`

        if (tiles[tileKey]) {
          useWorldStore.setState({
            tiles: {
              ...tiles,
              [tileKey]: { ...tiles[tileKey], image_filename: filename },
            },
          })
        }

        console.log(UpscaleServiceLog.TileUpdatedWithUpscaledImage, filename)
      }
    } catch (error) {
      console.error(UpscaleServiceLog.ErrorUpdatingTileAfterCompletion, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: UpscaleRunState, opId: string) {
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(runState.tileId))

    // Clear UI status
    useWorldStore.getState().removeUpscalingTile(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending upscale tasks from localStorage (call on app load)
   */
  resumePendingUpscales() {
    browserStorage.forEachPrefixed(DynamicLocalStoragePrefix.UpscaleRun, (key, raw) => {
      try {
        const runState: UpscaleRunState = JSON.parse(raw)
        if (runState.runId) {
          console.log(UpscaleServiceLog.ResumingPolling, runState.runId)

          useWorldStore.getState().addUpscalingTile(runState.tileX, runState.tileY)
          const opId = `${UpscaleOperationIdPrefix.Upscale}${runState.tileX}-${runState.tileY}`
          useGlobalStatusStore.getState().addOperation({
            id: opId,
            type: OperationTypeId.WorldGen,
            label: UpscaleOperationLabel.UpscalingTileResumed,
            details: `(${runState.tileX}, ${runState.tileY}) via ${runState.provider}`,
            status: AsyncOperationStatus.InProgress,
          })

          this.startPolling(runState, opId)
        }
      } catch {
        console.warn(UpscaleServiceLog.FailedToParseRunState, key)
        browserStorage.remove(key)
      }
    })
  }

  /**
   * Stop an in-progress upscale
   */
  stopUpscale(tileId: string) {
    const key = DynamicLocalStorageKeys.upscaleRun(tileId)
    const data = browserStorage.getString(key)
    if (data) {
      try {
        const runState: UpscaleRunState = JSON.parse(data)
        const opId = `${UpscaleOperationIdPrefix.Upscale}${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log(UpscaleServiceLog.StoppedForTile, tileId)
      } catch {
        browserStorage.remove(key)
      }
    }
  }

  getMjGrid(tileId: string): MjGridStoragePayload | null {
    const key = DynamicLocalStorageKeys.mjGrid(tileId)
    const data = browserStorage.getString(key)
    if (data) {
      try {
        const parsed: MjGridStoragePayload = JSON.parse(data)
        return parsed
      } catch {
        browserStorage.remove(key)
      }
    }
    return null
  }

  /**
   * Select a variant from MJ grid - crops the grid and saves
   */
  async selectMjVariant(tileId: string, variantIndex: 1 | 2 | 3 | 4): Promise<string | null> {
    if (typeof window === 'undefined') return null

    const gridData = this.getMjGrid(tileId)
    if (!gridData) {
      throw new Error(UpscaleServiceError.NoMjGridData)
    }

    console.log(UpscaleServiceLog.CroppingVariant, variantIndex, UpscaleServiceLog.From, gridData.gridImageUrl)

    const opId = `${UpscaleOperationIdPrefix.MjVariant}${gridData.runState?.tileX || 0}-${gridData.runState?.tileY || 0}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: OperationTypeId.WorldGen,
      label: UpscaleOperationLabel.CroppingMjVariant,
      details: `Variant ${variantIndex}`,
      status: AsyncOperationStatus.InProgress,
    })

    try {
      const { runId } = await triggerUpscaleVariantSelection({
        tileId,
        projectId: gridData.projectId,
        gridImageUrl: gridData.gridImageUrl,
        variantIndex,
      })

      console.log(UpscaleServiceLog.VariantSelectionTriggered, runId)

      // Store run state
      const runState: UpscaleRunState = {
        runId,
        tileId,
        tileX: gridData.runState?.tileX || 0,
        tileY: gridData.runState?.tileY || 0,
        projectId: gridData.projectId,
        provider: UpscaleProvider.Midjourney,
        startedAt: new Date().toISOString(),
      }
      browserStorage.setObject(DynamicLocalStorageKeys.upscaleRun(tileId), runState)

      browserStorage.remove(DynamicLocalStorageKeys.mjGrid(tileId))

      // Start polling
      this.startPolling(runState, opId)

      return runId
    } catch (error) {
      console.error(UpscaleServiceLog.VariantSelectionError, error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Clear MJ grid data without selecting (cancel)
   */
  clearMjGrid(tileId: string) {
    browserStorage.remove(DynamicLocalStorageKeys.mjGrid(tileId))
    browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(tileId))
  }
}

export const upscaleService = new UpscaleService()
