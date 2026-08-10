import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { LocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { fetchUrlAsBase64 } from '../../core/io/world-data.api'
import { triggerUpscale, triggerUpscaleVariantSelection } from '../../core/io/world-gen-trigger.api'
import {
  parseUpscaleProvider,
  UpscaleProvider,
} from '../../core/upscale-provider-wire'
import {
  AsyncOperationStatus,
  BooleanQueryValue,
  OperationTypeId,
  UpscaleOperationLabel,
  UpscaleServiceError,
  UpscaleServiceLog,
  UrlScheme,
} from '../../constants/upscale-service'
import type { Tile } from '../../core/world-types'
import { pollUpscaleRun } from './upscale-poll-run'
import {
  buildMjVariantOpId,
  handleUpscaleStartError,
  saveUpscaleRunState,
  trackUpscaleStart,
} from './upscale-run-status'
import { readMjGrid, removeMjGrid } from './upscale-run-storage'
import type { UpscaleRunState } from './upscale-run-types'

export async function startUpscaleRun(
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

  const opId = trackUpscaleStart(tile.x, tile.y, activeUpscaler)

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

    const runState: UpscaleRunState = {
      runId,
      tileId: tile.id,
      tileX: tile.x,
      tileY: tile.y,
      projectId: tile.project_id,
      provider: activeUpscaler,
      startedAt: new Date().toISOString(),
    }

    saveUpscaleRunState(runState)
    void pollUpscaleRun(runState, opId)

    return runId
  } catch (error) {
    console.error(UpscaleServiceLog.UpscaleError, error)
    handleUpscaleStartError(tile.x, tile.y, opId, error, UpscaleServiceError.UpscaleFailed)
    throw error
  }
}

export async function startMjVariantSelection(
  tileId: string,
  variantIndex: 1 | 2 | 3 | 4
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const gridData = readMjGrid(tileId)
  if (!gridData) {
    throw new Error(UpscaleServiceError.NoMjGridData)
  }

  console.log(UpscaleServiceLog.CroppingVariant, variantIndex, UpscaleServiceLog.From, gridData.gridImageUrl)

  const tileX = gridData.runState?.tileX ?? 0
  const tileY = gridData.runState?.tileY ?? 0
  const opId = buildMjVariantOpId(tileX, tileY)
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

    const runState: UpscaleRunState = {
      runId,
      tileId,
      tileX,
      tileY,
      projectId: gridData.projectId,
      provider: UpscaleProvider.Midjourney,
      startedAt: new Date().toISOString(),
    }
    saveUpscaleRunState(runState)
    removeMjGrid(tileId)

    void pollUpscaleRun(runState, opId)

    return runId
  } catch (error) {
    console.error(UpscaleServiceLog.VariantSelectionError, error)
    useGlobalStatusStore.getState().removeOperation(opId)
    throw error
  }
}
