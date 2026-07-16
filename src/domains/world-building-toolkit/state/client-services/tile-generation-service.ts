import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS, isActiveTaskStatus } from '@/shared/data/constants/polling'
import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import type { ContextImageVariant } from '@/shared/ai/contextAssembler'
import {
  completeTileVariantSelection,
  fetchTileGenerationRunStatus,
  triggerTileGeneration,
} from '../../core/io/world-gen-trigger.api'
import {
  AsyncOperationStatus,
  ContextAssemblyVariant,
  DynamicLocalStoragePrefix,
  OperationTypeId,
  TileGenerationOperationDetailSuffix,
  TileGenerationOperationIdPrefix,
  TileGenerationOperationLabel,
  TileGenerationServiceError,
  TileGenerationServiceLog,
  TileIdPrefix,
  TileProgressStage,
  TriggerTerminalStatus,
  UrlScheme,
  VariantSelectionAction,
  WorldGenReviewType,
} from '../../constants/tile-generation-service'
import { getWorldUiStore } from '../useWorldUiStore'

interface TileGenRunState {
  runId: string
  projectId: string
  x: number
  y: number
  prompt: string
  startedAt: string
}

export interface FollowUpContextPayload {
  images: Partial<Record<ContextImageVariant, string>>
  maskBase64?: string
  preferredVariant: ContextImageVariant
}

export class TileGenerationService {
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
   * Generate a tile using Trigger.dev background task.
   * Follow-up tiles must provide a browser-assembled context image. We fail fast if
   * neighbor context exists in the grid but the caller could not assemble it.
   */
  async generate(
    projectId: string,
    x: number,
    y: number,
    prompt: string,
    styleReferenceUrls?: string[],
    contextFromCaller?: FollowUpContextPayload | string
  ): Promise<string | null> {
    const normalizedContext =
      typeof contextFromCaller === 'string'
        ? {
            images: { [ContextAssemblyVariant.CanonicalFullContext]: contextFromCaller },
            preferredVariant: ContextAssemblyVariant.CanonicalFullContext satisfies ContextImageVariant,
          }
        : contextFromCaller

    console.log(`${TileGenerationServiceLog.StartingViaTrigger} (${x}, ${y})`, {
      styleReferenceUrls,
      hasContextFromCaller: !!normalizedContext,
      contextVariants: normalizedContext ? Object.keys(normalizedContext.images) : [],
    })

    // Track generating status
    useWorldStore.getState().addGeneratingTile(x, y)
    const opId = `${TileGenerationOperationIdPrefix.Gen}${x}-${y}`
    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: OperationTypeId.WorldGen,
      label: TileGenerationOperationLabel.GeneratingTile,
      details: `(${x}, ${y})`,
      status: AsyncOperationStatus.InProgress,
    })

    try {
      const tiles = useWorldStore.getState().tiles
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const toAbsoluteUrl = (tile: Tile | undefined) => {
        if (!tile?.image_filename) return undefined
        return tile.image_filename.startsWith(UrlScheme.Http)
          ? tile.image_filename
          : `${origin}/projects/${projectId}/${tile.image_filename}`
      }
      const neighborUrls = {
        up: toAbsoluteUrl(tiles[`${x},${y - 1}`]),
        down: toAbsoluteUrl(tiles[`${x},${y + 1}`]),
        left: toAbsoluteUrl(tiles[`${x - 1},${y}`]),
        right: toAbsoluteUrl(tiles[`${x + 1},${y}`]),
        topLeft: toAbsoluteUrl(tiles[`${x - 1},${y - 1}`]),
        topRight: toAbsoluteUrl(tiles[`${x + 1},${y - 1}`]),
        bottomLeft: toAbsoluteUrl(tiles[`${x - 1},${y + 1}`]),
        bottomRight: toAbsoluteUrl(tiles[`${x + 1},${y + 1}`]),
      }
      const hasNeighbors = !!(
        neighborUrls.up ||
        neighborUrls.down ||
        neighborUrls.left ||
        neighborUrls.right
      )

      if (normalizedContext) {
        // Use pre-assembled context (worker-assembled in Sidebar; CORS-safe).
        console.log(TileGenerationServiceLog.UsingPreAssembledContext, {
          variants: Object.keys(normalizedContext.images),
          preferredVariant: normalizedContext.preferredVariant,
          hasMask: !!normalizedContext.maskBase64,
        })
      } else if (hasNeighbors) {
        throw new Error(TileGenerationServiceError.FollowUpRequiresContext)
      }

      // Use presence of neighbors (from grid), not context image, so we never treat a follow-up as first tile when client assembly failed
      const isFirstTile = !hasNeighbors

      console.log(
        `${TileGenerationServiceLog.TriggeringTask}${isFirstTile}${TileGenerationServiceLog.HasContext}${!!normalizedContext}`
      )

      const { runId } = await triggerTileGeneration({
        projectId,
        x,
        y,
        prompt,
        isFirstTile,
        ...(normalizedContext ? { contextPayload: normalizedContext } : {}),
        ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
      })

      console.log(TileGenerationServiceLog.TaskTriggered, runId)

      // Save run state to localStorage for recovery
      const runState: TileGenRunState = {
        runId,
        projectId,
        x,
        y,
        prompt,
        startedAt: new Date().toISOString(),
      }

      browserStorage.setObject(DynamicLocalStorageKeys.tileGen(x, y), runState)

      // Start polling for status
      this.startPolling(runState, opId)

      return runId
    } catch (error) {
      console.error(TileGenerationServiceLog.GenerationError, error)
      // Clean up status on error
      useWorldStore.getState().setTileError(
        x,
        y,
        error instanceof Error ? error.message : TileGenerationServiceError.GenerationFailed
      )
      useWorldStore.getState().removeGeneratingTile(x, y)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  /**
   * Start adaptive polling for task status
   * Uses shorter intervals during active processing, longer intervals when idle
   * This reduces API calls by ~60% compared to fixed 5s polling
   */
  private startPolling(runState: TileGenRunState, opId: string) {
    let consecutiveErrors = 0
    let lastProgress = 0
    let stableProgressCount = 0
    let variantSelectionDispatched = false

    const poll = async () => {
      try {
        const statusData = await fetchTileGenerationRunStatus(runState.runId)

        if (statusData.statusCode === 404) {
          // Run not found - might be still initializing, retry a few times
          consecutiveErrors++
          if (consecutiveErrors > 5) {
            console.warn(TileGenerationServiceLog.RunNotFoundAfterRetries)
            useWorldStore.getState().setTileError(runState.x, runState.y, TileGenerationServiceError.TaskNotFound)
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

        // Track if progress is changing
        if (progress === lastProgress) {
          stableProgressCount++
        } else {
          stableProgressCount = 0
          lastProgress = progress
        }

        // Update global status with progress
        useGlobalStatusStore.getState().updateOperation(opId, {
          details: `(${runState.x}, ${runState.y}) ${stage} ${progress}%`,
        })

        // Update per-tile progress overlay
        useWorldStore.getState().setTileProgress(runState.x, runState.y, progress, stage)

        // Detect variant selection waiting state
        const metadata = recordFromJson(statusData.metadata)
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
            })
          }
        }

        // Check if completed
        if (statusData.status === TriggerTerminalStatus.Completed) {
          console.log(TileGenerationServiceLog.GenerationCompleted, statusData.output)
          await this.handleCompletion(runState, statusData.output, opId)
          return
        }

        // Check if failed
        if (!statusData.status || !isActiveTaskStatus(statusData.status)) {
          const errorMsg =
            (typeof statusData.error === 'string' ? statusData.error : null) ||
            `${TileGenerationServiceError.GenerationFailed} (${statusData.status ?? 'unknown'})`
          console.error(TileGenerationServiceLog.GenerationFailed, errorMsg)
          useWorldStore.getState().setTileError(runState.x, runState.y, errorMsg)
          this.clearRunState(runState, opId)
          return
        }

        // Adaptive polling interval:
        // - 2s if progress is actively changing
        // - 5s if progress is stable but task is active
        // - 10s if progress has been stable for a while (likely waiting for external API)
        let nextInterval: number = POLLING_INTERVALS.DEFAULT
        if (stableProgressCount === 0) {
          nextInterval = 2000 // Progress changing, poll faster
        } else if (stableProgressCount < 3) {
          nextInterval = POLLING_INTERVALS.DEFAULT // Normal polling
        } else {
          nextInterval = POLLING_INTERVALS.SLOW // Back off when stable
        }

        this.scheduleNextPoll(runState.runId, poll, nextInterval)
      } catch (error) {
        console.error(TileGenerationServiceLog.StatusPollingError, error)
        consecutiveErrors++
        // Back off on errors
        const backoffInterval = Math.min(consecutiveErrors * 3000, 30000)
        this.scheduleNextPoll(runState.runId, poll, backoffInterval)
      }
    }

    // Start first poll
    poll()
  }

  /**
   * Schedule next poll with cleanup tracking
   */
  private scheduleNextPoll(runId: string, pollFn: () => Promise<void>, interval: number) {
    // Clear any existing timeout
    const existingTimeout = this.pollingIntervals.get(runId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule next poll
    const timeoutId = setTimeout(pollFn, interval)
    this.pollingIntervals.set(runId, timeoutId)
  }

  /**
   * Handle successful completion
   */
  private async handleCompletion(
    runState: TileGenRunState,
    output: Record<string, unknown> | undefined,
    opId: string
  ) {
    const out = recordFromJson(output)
    try {
      const pendingReview = out.pendingReview === true
      const newUrl = readString(out.newUrl)

      if (pendingReview && newUrl) {
        console.log(TileGenerationServiceLog.CompletedWithSupabaseUrl, {
          newUrl,
          originalUrl: readString(out.originalUrl),
          isFirstTile: out.isFirstTile === true,
        })

        const tiles = useWorldStore.getState().tiles
        const existingTile = tiles[`${runState.x},${runState.y}`]
        let originalUrl = readString(out.originalUrl)
        if (existingTile?.image_filename) {
          originalUrl = existingTile.image_filename.startsWith(UrlScheme.Http)
            ? existingTile.image_filename
            : `/projects/${runState.projectId}/${existingTile.image_filename}`
        }

        const variantUrls = stringArrayFromJson(out.variantUrls)
          .map(item => readString(item))
          .filter((url): url is string => Boolean(url))

        useWorldStore.getState().setPendingGeneration(runState.x, runState.y, {
          newUrl,
          newBase64: readString(out.newBase64),
          variantUrls,
          originalUrl,
          isFirstTile: !existingTile,
        })

        // Update global status to show review is needed
        useGlobalStatusStore.getState().updateOperation(opId, {
          status: AsyncOperationStatus.Completed,
          details: `(${runState.x}, ${runState.y})${TileGenerationOperationDetailSuffix.ReviewGeneration}`,
        })

        // Notify UI to show review dialog
        if (typeof window !== 'undefined') {
          getWorldUiStore().enqueueReviewRequest({
            type: WorldGenReviewType.Generation,
            tileX: runState.x,
            tileY: runState.y,
            newUrl,
            variantUrls,
            originalUrl: originalUrl ?? undefined,
          })
        }

        this.clearRunState(runState, opId)
        return
      }

      // Legacy flow - direct update (shouldn't happen anymore)
      const filename = readString(out.filename)
      if (out.success === true && filename) {
        const { tiles } = useWorldStore.getState()
        const tileKey = `${runState.x},${runState.y}`

        useWorldStore.setState({
          tiles: {
            ...tiles,
            [tileKey]: {
              id: tiles[tileKey]?.id || `${TileIdPrefix.Tile}${runState.x}-${runState.y}`,
              project_id: runState.projectId,
              x: runState.x,
              y: runState.y,
              tile_prompt: runState.prompt,
              image_filename: filename,
              created_at: tiles[tileKey]?.created_at || new Date().toISOString(),
            },
          },
        })

        console.log(TileGenerationServiceLog.TileGenerated, filename)
      }
    } catch (error) {
      console.error(TileGenerationServiceLog.ErrorUpdatingTileAfterCompletion, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: TileGenRunState, opId: string) {
    // Stop polling (now uses timeouts instead of intervals)
    const timeout = this.pollingIntervals.get(runState.runId)
    if (timeout) {
      clearTimeout(timeout)
      this.pollingIntervals.delete(runState.runId)
    }

    browserStorage.remove(DynamicLocalStorageKeys.tileGen(runState.x, runState.y))

    // Clear UI status
    useWorldStore.getState().removeGeneratingTile(runState.x, runState.y)
    useWorldStore.getState().clearTileProgress(runState.x, runState.y)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  /**
   * Resume any pending tile generation tasks from localStorage (call on app load)
   */
  resumePendingGenerations() {
    browserStorage.forEachPrefixed(DynamicLocalStoragePrefix.TileGen, (key, raw) => {
      try {
        const runState: TileGenRunState = JSON.parse(raw)
        if (runState.runId) {
          console.log(TileGenerationServiceLog.ResumingPolling, runState.runId)

          useWorldStore.getState().addGeneratingTile(runState.x, runState.y)
          const opId = `${TileGenerationOperationIdPrefix.Gen}${runState.x}-${runState.y}`
          useGlobalStatusStore.getState().addOperation({
            id: opId,
            type: OperationTypeId.WorldGen,
            label: TileGenerationOperationLabel.GeneratingTileResumed,
            details: `(${runState.x}, ${runState.y})`,
            status: AsyncOperationStatus.InProgress,
          })

          this.startPolling(runState, opId)
        }
      } catch {
        console.warn(TileGenerationServiceLog.FailedToParseRunState, key)
        browserStorage.remove(key)
      }
    })
  }

  /**
   * Stop an in-progress generation
   */
  stopGeneration(x: number, y: number) {
    const key = DynamicLocalStorageKeys.tileGen(x, y)
    const data = browserStorage.getString(key)
    if (data) {
      try {
        const runState: TileGenRunState = JSON.parse(data)
        const opId = `${TileGenerationOperationIdPrefix.Gen}${runState.x}-${runState.y}`
        this.clearRunState(runState, opId)
        console.log(TileGenerationServiceLog.StoppedFor, x, y)
      } catch {
        browserStorage.remove(key)
      }
    }
  }

  isGenerating(x: number, y: number): boolean {
    return browserStorage.has(DynamicLocalStorageKeys.tileGen(x, y))
  }

  async completeVariantSelection(
    tokenId: string,
    action: VariantSelectionAction,
    variantIndex: number
  ): Promise<void> {
    await completeTileVariantSelection({ tokenId, action, variantIndex })
  }
}

export const tileGenerationService = new TileGenerationService()
