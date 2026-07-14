import type { SurfaceType } from '@/domains/interior-designer/core/interior-types'
import { SurfaceTypeValue } from '@/domains/interior-designer/constants/terrain-defaults'

export const GROUND_SURFACE_TYPES_FOR_WATER: SurfaceType[] = [
  SurfaceTypeValue.Grass,
  SurfaceTypeValue.Dirt,
  SurfaceTypeValue.Sand,
  SurfaceTypeValue.Rock,
]
