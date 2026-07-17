import { useWorldStore } from '../useWorldStore'
import type { Tile } from '../../core/world-types'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { LocalStorageKeys, DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { createTriggerRunStatusFetch } from '@/shared/data/polling/trigger-run-status-fetcher'
import {
  waitForTriggerRun,
  TriggerRunPollFailedError,
} from '@/shared/data/polling/wait-for-trigger-run'
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

const TRIGGER_RUN_NOT_FOUND_STATUS = 'NOT_FOUND'
const UNKNOWN_STATUS_LABEL = 'unknown'

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
  /**
   * Cleanup hook retained for API compatibility (polling is promise-based).
   */
  cleanup() {}

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
      void this.pollRun(runState, opId)

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

  private async pollRun(runState: UpscaleRunState, opId: string) {
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
            useGlobalStatusStore.getState().updateOperation(opId, {
              details: `(${runState.tileX}, ${runState.tileY}) ${stage} ${progress}%`,
            })
          },
        }
      )

      if (result.status === TriggerTerminalStatus.Completed) {
        console.log(UpscaleServiceLog.UpscaleCompleted, result.output)
        await this.handleCompletion(runState, result.output, opId)
      }
    } catch (error) {
      if (error instanceof TriggerRunPollFailedError) {
        const errorMsg =
          (typeof error.runError === 'string' ? error.runError : null) ||
          (error.status === TRIGGER_RUN_NOT_FOUND_STATUS
            ? UpscaleServiceError.TaskNotFound
            : `${UpscaleServiceError.UpscaleFailed} (${error.status ?? UNKNOWN_STATUS_LABEL})`)
        console.error(UpscaleServiceLog.UpscaleFailed, errorMsg)
        useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
      } else {
        console.error(UpscaleServiceLog.StatusPollingError, error)
      }
      this.clearRunState(runState, opId)
    }
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
      if (this.tryHandlePendingReview(runState, out, opId)) return
      if (this.tryHandleVariantSelection(runState, out, opId)) return
      this.applyDirectUpscaleResult(runState, out)
    } catch (error) {
      console.error(UpscaleServiceLog.ErrorUpdatingTileAfterCompletion, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  private tryHandlePendingReview(
    runState: UpscaleRunState,
    out: Record<string, unknown>,
    opId: string
  ): boolean {
    const upscaledUrl = readString(out.upscaledUrl)
    if (out.pendingReview !== true || !upscaledUrl) return false

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

    useGlobalStatusStore.getState().updateOperation(opId, {
      status: AsyncOperationStatus.Completed,
      details: `(${runState.tileX}, ${runState.tileY})${UpscaleOperationDetailSuffix.ReviewUpscale}`,
    })

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
    return true
  }

  private tryHandleVariantSelection(
    runState: UpscaleRunState,
    out: Record<string, unknown>,
    opId: string
  ): boolean {
    if (out.requiresVariantSelection !== true) return false

    console.log(UpscaleServiceLog.MjGridReceived, out)

    browserStorage.setObject(DynamicLocalStorageKeys.mjGrid(runState.tileId), {
      gridImageUrl: readString(out.gridImageUrl),
      taskId: readString(out.taskId),
      buttons: out.buttons,
      tileId: readString(out.tileId),
      projectId: readString(out.projectId),
      runState,
    })

    useGlobalStatusStore.getState().updateOperation(opId, {
      status: AsyncOperationStatus.Completed,
      details: `(${runState.tileX}, ${runState.tileY})${UpscaleOperationDetailSuffix.SelectVariant}`,
    })

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
    return true
  }

  private applyDirectUpscaleResult(runState: UpscaleRunState, out: Record<string, unknown>): void {
    const filename = readString(out.filename)
    if (out.success !== true || !filename) return

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

  /**
   * Clear run state and stop polling
   */
  private clearRunState(runState: UpscaleRunState, opId: string) {
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

          void this.pollRun(runState, opId)
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
      void this.pollRun(runState, opId)

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
