import * as THREE from 'three'
import { SCULPTABLE_SURFACE_WORLD_SIZE } from './sculptable-surface-shaders'

export function writeHeightmapToTexture(
  heightmap: Float32Array,
  texture: THREE.DataTexture,
  baseHeight: number
): void {
  const rawData = texture.image.data
  if (!(rawData instanceof Float32Array)) return
  const imageData: Float32Array = rawData

  const maxDisplacement = 10
  for (let i = 0; i < heightmap.length && i < imageData.length; i++) {
    imageData[i] = (heightmap[i] - baseHeight) / maxDisplacement + 0.5
  }
  texture.needsUpdate = true
}

export function sampleHeightmap(
  worldX: number,
  worldZ: number,
  heightmap: Float32Array | null,
  heightmapSize: number,
  baseHeight: number
): number {
  if (!heightmap || heightmapSize <= 0) return baseHeight

  const gridX = Math.floor(
    (worldX + SCULPTABLE_SURFACE_WORLD_SIZE / 2) * (heightmapSize / SCULPTABLE_SURFACE_WORLD_SIZE)
  )
  const gridZ = Math.floor(
    (worldZ + SCULPTABLE_SURFACE_WORLD_SIZE / 2) * (heightmapSize / SCULPTABLE_SURFACE_WORLD_SIZE)
  )

  if (gridX < 0 || gridX >= heightmapSize || gridZ < 0 || gridZ >= heightmapSize) {
    return baseHeight
  }

  return heightmap[gridZ * heightmapSize + gridX]
}

export function computeSurfaceBounds(
  points: Array<[number, number, number]> | undefined
): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  if (!points || points.length < 3) return null
  const xs = points.map(p => p[0])
  const zs = points.map(p => p[2])
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  }
}
