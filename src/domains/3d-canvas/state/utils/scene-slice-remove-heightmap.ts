import {
  GROUND_SURFACE_TYPES,
  TERRAIN_WORLD_SIZE,
  isPointInPolygon,
} from '../interior-store-constants'
import type { Surface } from '../../core/interior-types'
import {
  SCENE_LOG_BASE_HEIGHT_LABEL,
  SCENE_LOG_CLEARED_PREFIX,
  SCENE_LOG_HAS_HEIGHTMAP,
  SCENE_LOG_HAS_POINTS,
  SCENE_LOG_HEIGHTMAP_CELLS_SUFFIX,
  SCENE_LOG_HEIGHTMAP_SIZE,
  SCENE_LOG_NOT_CLEARING_PREFIX,
  SCENE_LOG_POLYGON_BOUNDS,
  SCENE_LOG_TERRAIN_WORLD_SIZE,
} from '../../constants/scene-slice-log'

type TerrainHeightmapState = {
  heightmap: Float32Array | null
  heightmapSize: number
  baseGroundHeight: number
}

export function clearHeightmapForRemovedSurface(
  surface: Surface | undefined,
  terrain: TerrainHeightmapState
): Float32Array | null {
  const { heightmap, heightmapSize, baseGroundHeight } = terrain

  if (
    !surface ||
    !GROUND_SURFACE_TYPES.includes(surface.type) ||
    !surface.points ||
    surface.points.length < 3 ||
    !heightmap
  ) {
    console.log(
      SCENE_LOG_NOT_CLEARING_PREFIX,
      surface ? GROUND_SURFACE_TYPES.includes(surface.type) : false,
      SCENE_LOG_HAS_POINTS,
      surface?.points?.length,
      SCENE_LOG_HAS_HEIGHTMAP,
      !!heightmap
    )
    return heightmap
  }

  const polygon: Array<[number, number]> = surface.points.map(p => [p[0], p[2]])
  const minX = Math.min(...polygon.map(p => p[0]))
  const maxX = Math.max(...polygon.map(p => p[0]))
  const minZ = Math.min(...polygon.map(p => p[1]))
  const maxZ = Math.max(...polygon.map(p => p[1]))

  console.log(SCENE_LOG_POLYGON_BOUNDS, { minX, maxX, minZ, maxZ })
  console.log(SCENE_LOG_HEIGHTMAP_SIZE, heightmapSize, SCENE_LOG_BASE_HEIGHT_LABEL, baseGroundHeight)
  console.log(SCENE_LOG_TERRAIN_WORLD_SIZE, TERRAIN_WORLD_SIZE)

  const newHeightmap = new Float32Array(heightmap)
  let clearedCount = 0

  for (let gridZ = 0; gridZ < heightmapSize; gridZ++) {
    for (let gridX = 0; gridX < heightmapSize; gridX++) {
      const worldX = (gridX / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2
      const worldZ = (gridZ / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2

      if (isPointInPolygon(worldX, worldZ, polygon)) {
        newHeightmap[gridZ * heightmapSize + gridX] = baseGroundHeight
        clearedCount++
      }
    }
  }

  console.log(
    SCENE_LOG_CLEARED_PREFIX,
    clearedCount,
    SCENE_LOG_HEIGHTMAP_CELLS_SUFFIX,
    surface.id,
    surface.type
  )

  return newHeightmap
}
