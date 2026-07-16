import { useWorldStore } from '@/domains/world-building-toolkit'
import { TILE_COORD_SEPARATOR } from '@/domains/world-building-toolkit/ui/constants/tile-stage-labels'

function tileCoordKey(x: number, y: number): string {
  return `${x}${TILE_COORD_SEPARATOR}${y}`
}

export function useTileViewState(x: number, y: number) {
  const key = tileCoordKey(x, y)

  const tile = useWorldStore(state => state.tiles[key])
  const selectedTiles = useWorldStore(state => state.selectedTiles)
  const currentProject = useWorldStore(state => state.currentProject)
  const generatingTiles = useWorldStore(state => state.generatingTiles)
  const upscalingTiles = useWorldStore(state => state.upscalingTiles)
  const repaintingTiles = useWorldStore(state => state.repaintingTiles)
  const enhancingTiles = useWorldStore(state => state.enhancingTiles)
  const tileError = useWorldStore(state => state.failedTiles[key])
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const tileProgressData = useWorldStore(state => state.tileProgress[key])

  const isSelected = selectedTiles.some(tileCoord => tileCoord.x === x && tileCoord.y === y)
  const isGenerating = Boolean(generatingTiles[key])
  const isUpscaling = Boolean(upscalingTiles[key])
  const isRepainting = Boolean(repaintingTiles[key])
  const isEnhancing = Boolean(enhancingTiles[key])
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
