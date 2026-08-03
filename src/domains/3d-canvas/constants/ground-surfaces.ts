import type { SurfaceType } from '@/domains/3d-canvas/core/interior-types'
import { SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'

export const GROUND_SURFACE_TYPES_FOR_WATER: SurfaceType[] = [
  SurfaceTypeValue.Grass,
  SurfaceTypeValue.Dirt,
  SurfaceTypeValue.Sand,
  SurfaceTypeValue.Rock,
]
