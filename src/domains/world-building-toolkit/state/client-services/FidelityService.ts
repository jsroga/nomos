import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { POLLING_INTERVALS, ACTIVE_TASK_STATUSES } from '@/shared/data/constants/polling'
import { TILE_COORD_SEPARATOR } from '../../ui/constants/tile-stage-labels'
import {
  AsyncOperationStatus,
  ContentType,
  DynamicLocalStoragePrefix,
  FidelityApiRoute,
  FidelityOperationDetailSuffix,
  FidelityOperationIdPrefix,
  FidelityOperationLabel,
  FidelityServiceError,
  FidelityServiceLog,
  HttpMethod,
  HttpRequestHeader,
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

      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
      const blob = await response.blob()

      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result !== 'string') return
          resolve(reader.result.split(',')[1])
        }
        reader.readAsDataURL(blob)
      })

      console.log(FidelityServiceLog.TriggeringTask)

      const triggerResponse = await fetch(FidelityApiRoute.Trigger, {
        method: HttpMethod.Post,
        headers: { [HttpRequestHeader.ContentType]: ContentType.Json },
        body: JSON.stringify({
          tileId: tile.id,
          projectId: tile.project_id,
          imageBase64: base64,
          stylePrompt,
          creativity,
          ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
        }),
      })

      const triggerData = await triggerResponse.json()

      if (!triggerResponse.ok || !triggerData.runId) {
        throw new Error(triggerData.error || FidelityServiceError.FailedToTriggerTask)
      }

      console.log(FidelityServiceLog.TaskTriggered, triggerData.runId)

      // 3. Save run state to localStorage for recovery
      const runState: FidelityRunState = {
        runId: triggerData.runId,
        tileId: tile.id,
        tileX: tile.x,
        tileY: tile.y,
        projectId: tile.project_id,
        startedAt: new Date().toISOString(),
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(DynamicLocalStorageKeys.fidelityRun(tile.id), JSON.stringify(runState))
      }

      // 4. Start polling for status
      this.startPolling(runState, opId)

      return triggerData.runId
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
        const statusResponse = await fetch(`${FidelityApiRoute.Status}?runId=${runState.runId}`)
        const statusData = await statusResponse.json()

        if (statusResponse.status === 404) {
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
        const progress = statusData.metadata?.progress || 0
        const stage = statusData.metadata?.stage || TileProgressStage.Unknown

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

        if (!ACTIVE_TASK_STATUSES.includes(statusData.status)) {
          const errorMsg = statusData.error || `${FidelityServiceError.EnhancementFailed} (${statusData.status})`
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
    output: {
      success: boolean
      filename: string
      enhancedUrl: string
      enhancedBase64: string
      originalUrl: string
      pendingReview?: boolean
    },
    opId: string
  ) {
    try {
      // Check if fidelity enhancement requires user review (new flow)
      if (output?.pendingReview && output?.enhancedUrl) {
        console.log(FidelityServiceLog.CompletedWithSupabaseUrl, {
          enhancedUrl: output.enhancedUrl,
          originalUrl: output.originalUrl,
        })

        // Images are now stored in Supabase Storage - use URL directly
        const enhancedUrl = output.enhancedUrl

        // For original, prefer local existing tile (if any)
        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.tileX}${TILE_COORD_SEPARATOR}${runState.tileY}`]
        const originalUrl = existingTile?.image_filename
          ? (existingTile.image_filename.startsWith(UrlScheme.Http)
              ? existingTile.image_filename
              : `/projects/${runState.projectId}/${existingTile.image_filename}`)
          : output.originalUrl || ''

        // Store pending fidelity in store
        useWorldStore.getState().setPendingFidelity(runState.tileX, runState.tileY, {
          newUrl: enhancedUrl,
          newBase64: output.enhancedBase64, // Still keep for acceptFidelity
          originalUrl,
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
            originalUrl,
          })
        }

        this.clearRunState(runState, opId)
        return
      }

      // Legacy flow - direct update (shouldn't happen anymore)
      if (output?.success && output?.filename) {
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.tileX}${TILE_COORD_SEPARATOR}${runState.tileY}`

        if (tiles[tileKey]) {
          useWorldStore.setState({
            tiles: {
              ...tiles,
              [tileKey]: { ...tiles[tileKey], image_filename: output.filename },
            },
          })
        }

        console.log(FidelityServiceLog.TileUpdatedWithEnhancedImage, output.filename)
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

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DynamicLocalStorageKeys.fidelityRun(runState.tileId))
    }

    // Clear UI status
    useWorldStore.getState().removeEnhancingTile(runState.tileX, runState.tileY)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending fidelity enhancement tasks from localStorage (call on app load)
   */
  resumePendingEnhancements() {
    if (typeof window === 'undefined') return

    // Find all fidelity run keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(DynamicLocalStoragePrefix.FidelityRun)) {
        try {
          const runState: FidelityRunState = JSON.parse(localStorage.getItem(key) || '')
          if (runState.runId) {
            console.log(FidelityServiceLog.ResumingPolling, runState.runId)

            // Re-add status indicators
            useWorldStore.getState().addEnhancingTile(runState.tileX, runState.tileY)
            const opId = `${FidelityOperationIdPrefix.Fidelity}${runState.tileX}-${runState.tileY}`
            useGlobalStatusStore.getState().addOperation({
              id: opId,
              type: OperationTypeId.WorldGen,
              label: FidelityOperationLabel.EnhancingFidelityResumed,
              details: `(${runState.tileX}, ${runState.tileY})`,
              status: AsyncOperationStatus.InProgress,
            })

            // Start polling
            this.startPolling(runState, opId)
          }
        } catch (_e) {
          console.warn(FidelityServiceLog.FailedToParseRunState, key)
          localStorage.removeItem(key)
        }
      }
    }
  }

  /**
   * Stop an in-progress fidelity enhancement
   */
  stopEnhancement(tileId: string) {
    if (typeof window === 'undefined') return

    const key = DynamicLocalStorageKeys.fidelityRun(tileId)
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const runState: FidelityRunState = JSON.parse(data)
        const opId = `${FidelityOperationIdPrefix.Fidelity}${runState.tileX}-${runState.tileY}`
        this.clearRunState(runState, opId)
        console.log(FidelityServiceLog.StoppedForTile, tileId)
      } catch (_e) {
        localStorage.removeItem(key)
      }
    }
  }
}

export const fidelityService = new FidelityService()
