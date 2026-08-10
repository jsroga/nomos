import { useWorldStore } from '../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { readString, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  AsyncOperationStatus,
  TileGenerationOperationDetailSuffix,
  TileGenerationServiceLog,
  TileIdPrefix,
  UrlScheme,
  WorldGenReviewType,
} from '../../constants/tile-generation-service'
import { getWorldUiStore } from '../useWorldUiStore'
import { clearTileGenRunState } from './tile-generation-run-status'
import type { TileGenRunState } from './tile-generation-run-types'

function handlePendingReview(
  runState: TileGenRunState,
  out: Record<string, unknown>,
  opId: string
): boolean {
  const pendingReview = out.pendingReview === true
  const newUrl = readString(out.newUrl)
  if (!pendingReview || !newUrl) return false

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

  useGlobalStatusStore.getState().updateOperation(opId, {
    status: AsyncOperationStatus.Completed,
    details: `(${runState.x}, ${runState.y})${TileGenerationOperationDetailSuffix.ReviewGeneration}`,
  })

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

  clearTileGenRunState(runState, opId)
  return true
}

function applyDirectGenerationResult(
  runState: TileGenRunState,
  out: Record<string, unknown>
): void {
  const filename = readString(out.filename)
  if (out.success !== true || !filename) return

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

export async function handleTileGenCompletion(
  runState: TileGenRunState,
  output: Record<string, unknown> | undefined,
  opId: string
): Promise<void> {
  const out = output ?? {}
  try {
    if (handlePendingReview(runState, out, opId)) return
    applyDirectGenerationResult(runState, out)
  } catch (error) {
    console.error(TileGenerationServiceLog.ErrorUpdatingTileAfterCompletion, error)
  } finally {
    clearTileGenRunState(runState, opId)
  }
}
