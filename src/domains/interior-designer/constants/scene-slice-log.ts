import type { SurfaceType } from '@/domains/interior-designer/core/interior-types'

/** Scene slice debug logs and geometry wire values. */

export const SCENE_LOG_REMOVE_SURFACE_PREFIX = '[removeSurface] Deleting surface:'
export const SCENE_LOG_TYPE_LABEL = 'type:'
export const SCENE_LOG_POINTS_LABEL = 'points:'
export const SCENE_LOG_POLYGON_BOUNDS = '[removeSurface] Polygon bounds:'
export const SCENE_LOG_HEIGHTMAP_SIZE = '[removeSurface] Heightmap size:'
export const SCENE_LOG_BASE_HEIGHT_LABEL = 'baseHeight:'
export const SCENE_LOG_TERRAIN_WORLD_SIZE = '[removeSurface] TERRAIN_WORLD_SIZE:'
export const SCENE_LOG_CLEARED_PREFIX = '[removeSurface] Cleared'
export const SCENE_LOG_HEIGHTMAP_CELLS_SUFFIX = 'heightmap cells for surface:'
export const SCENE_LOG_NOT_CLEARING_PREFIX = '[removeSurface] NOT clearing heightmap. isGround:'
export const SCENE_LOG_HAS_POINTS = 'hasPoints:'
export const SCENE_LOG_HAS_HEIGHTMAP = 'hasHeightmap:'

export const SCENE_CURVE_TYPE_CATMULLROM = 'catmullrom'
export const SCENE_CURVED_FLOOR_ERROR = 'Failed to generate curved floor geometry'

export const SCENE_SURFACE_TYPE_ROAD: SurfaceType = 'road'
