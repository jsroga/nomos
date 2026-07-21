import { useWorldStore } from '../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { readString } from '@/shared/data/json-guards'
import {
  AsyncOperationStatus,
  UpscaleOperationDetailSuffix,
  UpscaleServiceLog,
  UrlScheme,
  WorldGenReviewType,
} from '../../constants/upscale-service'
import { getWorldUiStore } from '../useWorldUiStore'
import { clearUpscaleRunState } from './upscale-run-status'
import { saveMjGrid } from './upscale-run-storage'
import type { UpscaleRunState } from './upscale-run-types'

function tryHandlePendingReview(
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

  clearUpscaleRunState(runState, opId)
  return true
}

function tryHandleVariantSelection(
  runState: UpscaleRunState,
  out: Record<string, unknown>,
  opId: string
): boolean {
  if (out.requiresVariantSelection !== true) return false

  console.log(UpscaleServiceLog.MjGridReceived, out)

  saveMjGrid(runState.tileId, {
    gridImageUrl: readString(out.gridImageUrl) ?? '',
    taskId: readString(out.taskId) ?? '',
    buttons: Array.isArray(out.buttons) ? out.buttons : [],
    tileId: readString(out.tileId) ?? runState.tileId,
    projectId: readString(out.projectId) ?? runState.projectId,
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

function applyDirectUpscaleResult(runState: UpscaleRunState, out: Record<string, unknown>): void {
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

export async function handleUpscaleCompletion(
  runState: UpscaleRunState,
  output: Record<string, unknown> | undefined,
  opId: string
): Promise<void> {
  const out = output ?? {}
  try {
    if (tryHandlePendingReview(runState, out, opId)) return
    if (tryHandleVariantSelection(runState, out, opId)) return
    applyDirectUpscaleResult(runState, out)
  } catch (error) {
    console.error(UpscaleServiceLog.ErrorUpdatingTileAfterCompletion, error)
  } finally {
    clearUpscaleRunState(runState, opId)
  }
}
