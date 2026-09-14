import type { Tile } from '../../core/world-types'
import { fetchUrlAsBase64 } from '../../core/io/world-data.api'
import { triggerTileGeneration } from '../../core/io/world-gen-trigger.api'
import {
  TileGenerationServiceError,
  TileGenerationServiceLog,
  UrlScheme,
} from '../../constants/tile-generation-service'
import { pollTileGenRun } from './tile-generation-poll-run'
import {
  handleTileGenStartError,
  saveTileGenRunState,
  trackTileGenStart,
} from './tile-generation-run-status'
import type { TileGenRunState } from './tile-generation-run-types'

enum SettledResultStatus {
  Rejected = 'rejected',
}

export function restyleableTiles(tiles: Record<string, Tile>): Tile[] {
  return Object.values(tiles).filter(tile => Boolean(tile.image_filename))
}

export function tilePublicImageUrl(tile: Tile): string | undefined {
  if (!tile.image_filename) return undefined
  if (tile.image_filename.startsWith(UrlScheme.Http)) return tile.image_filename
  return `/projects/${tile.project_id}/${tile.image_filename}`
}

export async function restyleAllTiles(input: {
  tiles: readonly Tile[]
  restyleOne: (tile: Tile) => Promise<unknown>
}): Promise<{ started: number; failed: number }> {
  const results = await Promise.allSettled(input.tiles.map(tile => input.restyleOne(tile)))
  let failed = 0
  for (const result of results) {
    if (result.status === SettledResultStatus.Rejected) failed += 1
  }
  return { started: results.length - failed, failed }
}

export async function startTileRestyle(input: {
  projectId: string
  tile: Tile
  styleReferenceUrls: string[]
  masterPrompt: string
}): Promise<string | null> {
  const imageUrl = tilePublicImageUrl(input.tile)
  if (!imageUrl) {
    throw new Error(TileGenerationServiceError.RestyleRequiresImage)
  }

  const opId = trackTileGenStart(input.tile.x, input.tile.y)
  const prompt = input.tile.tile_prompt?.trim() || input.masterPrompt

  try {
    const contextImageBase64 = await fetchUrlAsBase64(imageUrl)
    const { runId } = await triggerTileGeneration({
      projectId: input.projectId,
      x: input.tile.x,
      y: input.tile.y,
      prompt,
      isFirstTile: false,
      restyleExistingTile: true,
      contextImageBase64,
      styleReferenceUrls: input.styleReferenceUrls,
    })

    const runState: TileGenRunState = {
      runId,
      projectId: input.projectId,
      x: input.tile.x,
      y: input.tile.y,
      prompt,
      startedAt: new Date().toISOString(),
    }
    saveTileGenRunState(runState)
    void pollTileGenRun(runState, opId)
    return runId
  } catch (error) {
    console.error(TileGenerationServiceLog.GenerationError, error)
    handleTileGenStartError(
      input.tile.x,
      input.tile.y,
      opId,
      error,
      TileGenerationServiceError.GenerationFailed,
    )
    throw error
  }
}
