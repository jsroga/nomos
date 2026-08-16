import { useWorldStore } from '../useWorldStore'
import { triggerTileGeneration } from '../../core/io/world-gen-trigger.api'
import {
  TileGenerationServiceError,
  TileGenerationServiceLog,
} from '../../constants/tile-generation-service'
import { buildNeighborUrls } from './tile-generation-neighbors'
import { neighborImageUrlsFromSides } from '../../core/neighbor-image-urls'
import { pollTileGenRun } from './tile-generation-poll-run'
import {
  handleTileGenStartError,
  saveTileGenRunState,
  trackTileGenStart,
} from './tile-generation-run-status'
import {
  normalizeTileGenContext,
  type FollowUpContextPayload,
  type TileGenRunState,
} from './tile-generation-run-types'

export async function startTileGeneration(
  projectId: string,
  x: number,
  y: number,
  prompt: string,
  styleReferenceUrls?: string[],
  contextFromCaller?: FollowUpContextPayload | string
): Promise<string | null> {
  const normalizedContext = normalizeTileGenContext(contextFromCaller)

  console.log(`${TileGenerationServiceLog.StartingViaTrigger} (${x}, ${y})`, {
    styleReferenceUrls,
    hasContextFromCaller: !!normalizedContext,
    contextVariants: normalizedContext ? Object.keys(normalizedContext.images) : [],
  })

  const opId = trackTileGenStart(x, y)

  try {
    const tiles = useWorldStore.getState().tiles
    const { neighborUrls, hasNeighbors } = buildNeighborUrls(projectId, x, y, tiles)
    const neighborImageUrls = neighborImageUrlsFromSides(neighborUrls)

    if (normalizedContext) {
      console.log(TileGenerationServiceLog.UsingPreAssembledContext, {
        variants: Object.keys(normalizedContext.images),
        preferredVariant: normalizedContext.preferredVariant,
        hasMask: !!normalizedContext.maskBase64,
      })
    } else if (hasNeighbors) {
      throw new Error(TileGenerationServiceError.FollowUpRequiresContext)
    }

    const isFirstTile = !hasNeighbors

    console.log(
      `${TileGenerationServiceLog.TriggeringTask}${isFirstTile}${TileGenerationServiceLog.HasContext}${!!normalizedContext}`
    )

    const packedCrop =
      normalizedContext?.cropRect &&
      normalizedContext.packedWidth &&
      normalizedContext.packedHeight
        ? {
            cropRect: normalizedContext.cropRect,
            packedWidth: normalizedContext.packedWidth,
            packedHeight: normalizedContext.packedHeight,
          }
        : undefined

    const { runId } = await triggerTileGeneration({
      ...(packedCrop ? { packedCrop } : {}),
      projectId,
      x,
      y,
      prompt,
      isFirstTile,
      ...(normalizedContext ? { contextPayload: normalizedContext } : {}),
      ...(styleReferenceUrls?.length ? { styleReferenceUrls } : {}),
      ...(Object.keys(neighborImageUrls).length > 0 ? { neighborImageUrls } : {}),
    })

    console.log(TileGenerationServiceLog.TaskTriggered, runId)

    const runState: TileGenRunState = {
      runId,
      projectId,
      x,
      y,
      prompt,
      startedAt: new Date().toISOString(),
    }

    saveTileGenRunState(runState)
    void pollTileGenRun(runState, opId)

    return runId
  } catch (error) {
    console.error(TileGenerationServiceLog.GenerationError, error)
    handleTileGenStartError(x, y, opId, error, TileGenerationServiceError.GenerationFailed)
    throw error
  }
}
