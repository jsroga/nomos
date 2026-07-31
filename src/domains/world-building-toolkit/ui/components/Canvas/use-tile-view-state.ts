import { useWorldStore } from '@/domains/world-building-toolkit'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { TILE_COORD_SEPARATOR } from '@/domains/world-building-toolkit/ui/constants/tile-stage-labels'

function tileCoordKey(x: number, y: number): string {
  return `${x}${TILE_COORD_SEPARATOR}${y}`
}

/** Per-tile selectors only — avoids re-rendering every tile on pan/poll/progress for other tiles. */
export function useTileViewState(x: number, y: number) {
  const key = tileCoordKey(x, y)

  const tile = useWorldStore(state => state.tiles[key])
  const isSelected = useWorldStore(state =>
    state.selectedTiles.some(tileCoord => tileCoord.x === x && tileCoord.y === y)
  )
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const isGenerating = useWorldStore(state => Boolean(state.generatingTiles[key]))
  const isUpscaling = useWorldStore(state => Boolean(state.upscalingTiles[key]))
  const isRepainting = useWorldStore(state => Boolean(state.repaintingTiles[key]))
  const isEnhancing = useWorldStore(state => Boolean(state.enhancingTiles[key]))
  const tileError = useWorldStore(state => state.failedTiles[key])
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const tileProgressData = useWorldStore(state => state.tileProgress[key])

  const isBusy = isGenerating || isUpscaling || isRepainting || isEnhancing

  return {
    tile,
    currentProject,
    tileError,
    isSelectMode,
    tileProgressData,
    isSelected,
    isGenerating,
    isUpscaling,
    isRepainting,
    isEnhancing,
    isBusy,
  }
}
