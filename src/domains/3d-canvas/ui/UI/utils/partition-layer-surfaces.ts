import type { Surface } from '@/domains/3d-canvas'
import { GROUND_SURFACE_TYPES } from '@/domains/3d-canvas/state/interior-store-constants'
import { SurfaceTypeValue } from '@/domains/3d-canvas/constants/terrain-defaults'

export type LayerSurfaceGroups = {
  terrain: Surface[]
  water: Surface[]
  roads: Surface[]
  wallSurfaces: Surface[]
}

export function partitionLayerSurfaces(surfaces: Surface[]): LayerSurfaceGroups {
  const terrain: Surface[] = []
  const water: Surface[] = []
  const roads: Surface[] = []
  const wallSurfaces: Surface[] = []

  for (const surface of surfaces) {
    if (GROUND_SURFACE_TYPES.includes(surface.type)) {
      terrain.push(surface)
      continue
    }
    if (surface.type === SurfaceTypeValue.Water) {
      water.push(surface)
      continue
    }
    if (surface.type === SurfaceTypeValue.Road || surface.isPath) {
      roads.push(surface)
      continue
    }
    if (surface.type === SurfaceTypeValue.Wall) {
      wallSurfaces.push(surface)
    }
  }

  return { terrain, water, roads, wallSurfaces }
}
