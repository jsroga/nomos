import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/shared/data/constants/polling'
import { fileReaderText } from '@/shared/data/json-guards'
import {
  parseUpscaleProvider,
  UpscaleProvider,
} from '../../core/upscale-provider-wire'
import {
  AsyncOperationStatus,
  BooleanQueryValue,
  ContentType,
  DynamicLocalStoragePrefix,
  HttpMethod,
  HttpRequestHeader,
  OperationTypeId,
  TriggerTerminalStatus,
  TileProgressStage,
  UpscaleApiRoute,
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
      provider ??
      (typeof window !== 'undefined'
        ? parseUpscaleProvider(localStorage.getItem(LocalStorageKeys.AI_ACTIVE_UPSCALER))
        : UpscaleProvider.Stability)

    const skipGeminiPreUpscale = typeof window !== 'undefined'
      ? localStorage.getItem(LocalStorageKeys.SKIP_GEMINI_PRE_UPSCALE) === BooleanQueryValue.True
      : false

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
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
      const blob = await response.blob()

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = fileReaderText(reader.result)
          if (!dataUrl || !dataUrl.includes(',')) {
            reject(new Error(UpscaleServiceError.InvalidDataUrl))
            return
          }
          resolve(dataUrl.split(',')[1])
        }
        reader.readAsDataURL(blob)
      })

      console.log(`${UpscaleServiceLog.TriggeringTask} ${activeUpscaler}`)

      const triggerResponse = await fetch(UpscaleApiRoute.Trigger, {
        method: HttpMethod.Post,
        headers: { [HttpRequestHeader.ContentType]: ContentType.Json },
        body: JSON.stringify({
          tileId: tile.id,
          projectId: tile.project_id,
          imageBase64: base64,
          prompt: tile.tile_prompt,
          creativity,
          provider: activeUpscaler,
          skipGeminiPreUpscale,
          ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok || !triggerData.runId) {
        throw new Error(triggerData.error || UpscaleServiceError.FailedToTriggerTask)
      }

      console.log(UpscaleServiceLog.TaskTriggered, triggerData.runId)

      // 3. Save run state to localStorage for recovery
      const runState: UpscaleRunState = {
        runId: triggerData.runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        provider: activeUpscaler,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(DynamicLocalStorageKeys.upscaleRun(tile.id), JSON.stringify(runState))
      }

      // 4. Start polling for status
      this.startPolling(runState, opId)

      return triggerData.runId
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
        const statusResponse = await fetch(`${UpscaleApiRoute.Status}?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
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
        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || TileProgressStage.Unknown

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
        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          const errorMsg = statusData.error || `${UpscaleServiceError.UpscaleFailed} (${statusData.status})`
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
  private async handleCompletion(runState: UpscaleRunState, output: any, opId: string) {
    try {
      // Check if upscale requires user review (new flow)
      if (output?.pendingReview && output?.upscaledUrl) {
        console.log(UpscaleServiceLog.CompletedWithSupabaseUrls, {
          upscaledUrl: output.upscaledUrl,
          originalUrl: output.originalUrl,
          filename: output.filename,
        })

        // Images are now stored in Supabase Storage - use URLs directly
        const upscaledUrl = output.upscaledUrl

        // For original, prefer the local existing tile (if any), otherwise use uploaded original
        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX},${runState.tileY}`]
        const originalUrl = existingTile?.image_filename
          ? (existingTile.image_filename.startsWith(UrlScheme.Http)
              ? existingTile.image_filename
              : `/projects/${runState.projectId}/${existingTile.image_filename}`)
          : output.originalUrl

        // Store pending upscale in store
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
      if (output?.requiresVariantSelection) {
        console.log(UpscaleServiceLog.MjGridReceived, output)

        // Store the grid data for variant selection UI
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            DynamicLocalStorageKeys.mjGrid(runState.tileId),
            JSON.stringify({
              gridImageUrl: output.gridImageUrl,
              taskId: output.taskId,
              buttons: output.buttons,
              tileId: output.tileId,
              projectId: output.projectId,
              runState,
            })
          )
        }

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
        if (typeof window !== 'undefined') {
          getWorldUiStore().notifyMjGridReady({
            tileId: runState.tileId,
            tileX: runState.tileX,
            tileY: runState.tileY,
            gridImageUrl: output.gridImageUrl,
            buttons: output.buttons ?? [],
            taskId: output.taskId,
          })
        }
        return
      }

      // Normal completion (non-MJ or variant selected) - LEGACY, shouldn't happen anymore
      if (output?.success && output?.filename) {
        // Update the store with the new filename
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.tileX},${runState.tileY}`

        if (tiles[tileKey]) {
          useWorldStore.setState({
            tiles: {
              ...tiles,
              [tileKey]: { ...tiles[tileKey], image_filename: output.filename },
            },
          })
        }

        console.log(UpscaleServiceLog.TileUpdatedWithUpscaledImage, output.filename)
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

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.upscaleRun(runState.tileId))
    }

    // Clear UI status
    useWorldStore.getState().removeUpscalingTile(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending upscale tasks from localStorage (call on app load)
   */
  resumePendingUpscales() {
    if (typeof window === 'undefined') return

    // Find all upscale run keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DynamicLocalStoragePrefix.UpscaleRun)) {
        try {
          const runState: UpscaleRunState = JSON.parse(localStorage.getItem(key) || '')
          if (runState.runId) {
            console.log(UpscaleServiceLog.ResumingPolling, runState.runId)

            // Re-add status indicators
            useWorldStore.getState().addUpscalingTile(runState.tileX, runState.tileY)
            const opId = `${UpscaleOperationIdPrefix.Upscale}${runState.tileX}-${runState.tileY}`
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: OperationTypeId.WorldGen,
              label: UpscaleOperationLabel.UpscalingTileResumed,
              details: `(${runState.tileX}, ${runState.tileY}) via ${runState.provider}`,
              status: AsyncOperationStatus.InProgress,
            })

            // Start polling
            this.startPolling(runState, opId)
          }
        } catch (e) {
          console.warn(UpscaleServiceLog.FailedToParseRunState, key)
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Stop an in-progress upscale
   */
  stopUpscale(tileId: string) {
    if (typeof window === 'undefined') return

    const key = DynamicLocalStorageKeys.upscaleRun(tileId)
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const runState: UpscaleRunState = JSON.parse(data)
        const opId = `${UpscaleOperationIdPrefix.Upscale}${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log(UpscaleServiceLog.StoppedForTile, tileId)
      } catch (e) {
        localStorage.removeItem(key)
      }
    }
  }

  /**
   * Get pending MJ grid for a tile (if any)
   */
  getMjGrid(tileId: string): {
    gridImageUrl: string
    taskId: string
    buttons: any[]
    tileId: string
    projectId: string
    runState?: UpscaleRunState
  } | null {
    if (typeof window === 'undefined') return null

    const key = DynamicLocalStorageKeys.mjGrid(tileId)
    const data = localStorage.getItem(key)
    if (data) {
      try {
        return JSON.parse(data)
      } catch (e) {
        localStorage.removeItem(key)
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
      const response = await fetch(UpscaleApiRoute.SelectVariant, {
        method: HttpMethod.Post,
        headers: { [HttpRequestHeader.ContentType]: ContentType.Json },
        body: JSON.stringify({
          tileId,
          projectId: gridData.projectId,
          gridImageUrl: gridData.gridImageUrl,
          variantIndex,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.runId) {
        throw new Error(data.error || UpscaleServiceError.FailedToTriggerVariantSelection)
      }

      console.log(UpscaleServiceLog.VariantSelectionTriggered, data.runId)

      // Store run state
      const runState: UpscaleRunState = {
        runId: data.runId,
        tileId,
        tileX: gridData.runState?.tileX || 0,
        tileY: gridData.runState?.tileY || 0,
        projectId: gridData.projectId,
        provider: UpscaleProvider.Midjourney,
        startedAt: new Date().toISOString(),
      }
      localStorage.setItem(DynamicLocalStorageKeys.upscaleRun(tileId), JSON.stringify(runState))

      // Clear grid data
      localStorage.removeItem(DynamicLocalStorageKeys.mjGrid(tileId))

      // Start polling
      this.startPolling(runState, opId)

      return data.runId
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
    if (typeof window === 'undefined') return
    localStorage.removeItem(DynamicLocalStorageKeys.mjGrid(tileId))
    localStorage.removeItem(DynamicLocalStorageKeys.upscaleRun(tileId))
  }
}

export const upscaleService = new UpscaleService()
