import type {
  SurfaceType,
  TerrainBrushSettings,
  TerrainMaterialPaintSettings,
  TerrainSettings,
} from '../core/interior-types'

import {
  GROUND_SURFACE_TYPE_VALUES,
  GridResolutionValue,
  TerrainBrushTypeValue,
  TerrainColor,
  TerrainMaterialTypeValue,
  TerrainQualityValue,
} from '@/domains/interior-designer/constants/terrain-defaults'

export { GRID_RESOLUTION_MAP } from '@/domains/interior-designer/constants/terrain-defaults'

export const TERRAIN_WORLD_SIZE = 64

export const GROUND_SURFACE_TYPES: SurfaceType[] = GROUND_SURFACE_TYPE_VALUES

export const isPointInPolygon = (x: number, z: number, polygon: Array<[number, number]>): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export const createDefaultTerrainSettings = (): TerrainSettings => ({
  baseGroundHeight: 0,
  waterSurfaceHeight: -3,
  showWaterPlane: true,
  gridResolution: GridResolutionValue.Medium,
  quality: TerrainQualityValue.Medium,
  groundColor: TerrainColor.Ground,
  waterColor: TerrainColor.Water,
  waterOpacity: 0.4,
  sunAngle: 45,
  heightmapSize: 64,
  heightmap: null,
  heightmapVersion: 0,
  materialMap: null,
})

export const createDefaultTerrainBrush = (): TerrainBrushSettings => ({
  type: TerrainBrushTypeValue.Raise,
  size: 20,
  strength: 10,
  fidelity: 50,
  pixelate: false,
  position: null,
})

export const createDefaultTerrainMaterialPaint = (): TerrainMaterialPaintSettings => ({
  activeMaterial: TerrainMaterialTypeValue.Ground,
})
