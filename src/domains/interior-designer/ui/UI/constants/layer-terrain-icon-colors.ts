import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'
import type { SurfaceType } from '@/domains/interior-designer/core/interior-types'

export enum LayerTerrainIconColor {
  Grass = '#22c55e',
  Mars = '#ef4444',
  Sand = '#eab308',
  Rock = '#71717a',
}

const LAYER_TERRAIN_ICON_COLORS: Partial<Record<SurfaceType, LayerTerrainIconColor>> = {
  [SurfaceTypeValue.Grass]: LayerTerrainIconColor.Grass,
  [SurfaceTypeValue.Mars]: LayerTerrainIconColor.Mars,
  [SurfaceTypeValue.Sand]: LayerTerrainIconColor.Sand,
  [SurfaceTypeValue.Rock]: LayerTerrainIconColor.Rock,
}

export function getLayerTerrainIconColor(
  type: SurfaceType,
  isSelected: boolean
): string | undefined {
  if (isSelected) return undefined
  return LAYER_TERRAIN_ICON_COLORS[type]
}
