import type { SurfaceType } from '@/domains/interior-designer/core/interior-types'
import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'
import { SurfaceMaterialColor } from '@/domains/interior-designer/constants/surface-render-config'
import { CATMULL_ROM_CURVE_TYPE } from '@/domains/interior-designer/constants/three-js'

export interface SurfaceToolConfig {
  width?: number
  isPath: boolean
  color: string
  layer: number
}

export const SURFACE_TOOL_CONFIG: Record<SurfaceType, SurfaceToolConfig> = {
  [SurfaceTypeValue.Grass]: { isPath: false, color: SurfaceMaterialColor.Grass, layer: 0 },
  [SurfaceTypeValue.Water]: { isPath: false, color: SurfaceMaterialColor.Water, layer: 1 },
  [SurfaceTypeValue.Dirt]: { isPath: true, width: 2, color: SurfaceMaterialColor.Dirt, layer: 2 },
  [SurfaceTypeValue.Road]: { isPath: true, width: 4, color: SurfaceMaterialColor.Road, layer: 3 },
  [SurfaceTypeValue.Pavement]: {
    isPath: false,
    color: SurfaceMaterialColor.Pavement,
    layer: 4,
  },
  [SurfaceTypeValue.Mars]: { isPath: false, color: SurfaceMaterialColor.Mars, layer: 0 },
  [SurfaceTypeValue.Sand]: { isPath: false, color: SurfaceMaterialColor.Sand, layer: 0 },
  [SurfaceTypeValue.Rock]: { isPath: true, width: 3, color: SurfaceMaterialColor.Rock, layer: 2 },
  [SurfaceTypeValue.Wall]: {
    isPath: false,
    color: SurfaceMaterialColor.WallTool,
    layer: 5,
  },
}

export const SURFACE_TOOL_DEFAULT_TYPE = SurfaceTypeValue.Grass
export const SURFACE_TOOL_CURVE_TYPE = CATMULL_ROM_CURVE_TYPE
