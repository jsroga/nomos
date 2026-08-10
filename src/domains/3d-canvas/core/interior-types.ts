export type InteractionMode =
  | 'SELECT'
  | 'WALL'
  | 'FLOOR'
  | 'WATER'
  | 'OBJECT'
  | 'SCATTER'
  | 'SURFACE'
  | 'TERRAIN'

export type SurfaceType =
  | 'grass'
  | 'water'
  | 'road'
  | 'dirt'
  | 'pavement'
  | 'mars'
  | 'sand'
  | 'rock'
  | 'wall'

export type TerrainBrushType = 'raise' | 'lower' | 'flatten' | 'smooth'
export type TerrainMaterialType = 'ground' | 'water'
export type GridResolution = 'low' | 'medium' | 'high'
export type TerrainQuality = 'low' | 'medium' | 'high'

export const TERRAIN_QUALITY_RESOLUTION: Record<TerrainQuality, number> = {
  low: 8,
  medium: 16,
  high: 40,
}

export interface TerrainSettings {
  baseGroundHeight: number
  waterSurfaceHeight: number
  showWaterPlane: boolean
  gridResolution: GridResolution
  quality: TerrainQuality
  groundColor: string
  waterColor: string
  waterOpacity: number
  sunAngle: number
  heightmapSize: number
  heightmap: Float32Array | null
  heightmapVersion: number
  materialMap: Uint8Array | null
}

export interface TerrainBrushSettings {
  type: TerrainBrushType
  size: number
  strength: number
  fidelity: number
  pixelate: boolean
  position: [number, number, number] | null
}

export interface TerrainMaterialPaintSettings {
  activeMaterial: TerrainMaterialType
}

export interface Surface {
  id: string
  type: SurfaceType
  points: [number, number, number][]
  isPath: boolean
  curved: boolean
  width?: number
  layerIndex: number
  texture?: string
  textureScale?: number
  roughness?: number
  metalness?: number
  roundness?: number
  height?: number
  isVertical?: boolean
  rotation?: [number, number, number]
  level?: number
}

export interface Wall {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  height: number
  thickness: number
  texture?: string
  level?: number
}

export interface Floor {
  id: string
  points: [number, number, number][]
  y: number
  texture?: string
  level?: number
}

export interface Water {
  id: string
  points: [number, number, number][]
  y: number
}

export type ObjectType = 'generic' | 'window' | 'door'

export interface SceneObject {
  id: string
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  objectType?: ObjectType
  color?: string
  groupId?: string
  isLoading?: boolean
  thumbnailUrl?: string
  targetDimensions?: [number, number, number]
  level?: number
}

export interface ObjectGroup {
  id: string
  name: string
}
