import * as THREE from 'three'
import { TERRAIN_QUALITY_RESOLUTION } from '@/domains/interior-designer'
import { TerrainColor } from '@/domains/interior-designer/constants/terrain-defaults'
import { TERRAIN_WALL_SIDE_COLOR } from '@/domains/interior-designer/constants/mesh-colors'
import { BufferGeometryAttribute } from '@/domains/interior-designer/constants/three-js'
import type { SurfaceRenderConfig } from '@/domains/interior-designer/constants/surface-render-config'
import { sampleHeightmap } from './sculptable-surface-helpers'

export function buildSculptableTopGeometry(params: {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  quality: keyof typeof TERRAIN_QUALITY_RESOLUTION
  color?: string
}): THREE.BufferGeometry {
  const { bounds, quality, color } = params
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  const resolution = TERRAIN_QUALITY_RESOLUTION[quality]
  const segX = Math.max(2, Math.ceil(width * resolution))
  const segZ = Math.max(2, Math.ceil(depth * resolution))

  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const groundColor = new THREE.Color(color || TerrainColor.Ground)

  for (let iz = 0; iz <= segZ; iz++) {
    for (let ix = 0; ix <= segX; ix++) {
      const x = bounds.minX + (ix / segX) * width
      const z = bounds.minZ + (iz / segZ) * depth
      positions.push(x, 0, z)
      uvs.push(ix / segX, iz / segZ)
      colors.push(groundColor.r, groundColor.g, groundColor.b)
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix
      indices.push(a, a + segX + 1, a + 1)
      indices.push(a + 1, a + segX + 1, a + segX + 2)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute(BufferGeometryAttribute.Position, new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute(BufferGeometryAttribute.Uv, new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute(BufferGeometryAttribute.Color, new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function buildSculptableWallGeometry(params: {
  points: Array<[number, number, number]>
  config: SurfaceRenderConfig
  heightmap: Float32Array | null
  heightmapSize: number
  baseHeight: number
}): THREE.BufferGeometry {
  const { points, config, heightmap, heightmapSize, baseHeight } = params
  const n = points.length
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  let vertexIndex = 0
  const wallColor = new THREE.Color(TERRAIN_WALL_SIDE_COLOR)
  const wallDepth = config.depth || 1
  const edgeSubdivisions = 20

  for (let i = 0; i < n; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % n]

    for (let j = 0; j < edgeSubdivisions; j++) {
      const t1 = j / edgeSubdivisions
      const t2 = (j + 1) / edgeSubdivisions
      const x1 = p1[0] + (p2[0] - p1[0]) * t1
      const z1 = p1[2] + (p2[2] - p1[2]) * t1
      const x2 = p1[0] + (p2[0] - p1[0]) * t2
      const z2 = p1[2] + (p2[2] - p1[2]) * t2

      const h1 = sampleHeightmap(x1, z1, heightmap, heightmapSize, baseHeight) - baseHeight
      const h2 = sampleHeightmap(x2, z2, heightmap, heightmapSize, baseHeight) - baseHeight
      const topY1 = h1 + 0.02
      const topY2 = h2 + 0.02
      const bottomY = -wallDepth

      positions.push(x1, topY1, z1, x1, bottomY, z1, x2, topY2, z2, x2, bottomY, z2)
      for (let k = 0; k < 4; k++) {
        colors.push(wallColor.r, wallColor.g, wallColor.b)
      }
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2)
      indices.push(vertexIndex + 2, vertexIndex + 1, vertexIndex + 3)
      vertexIndex += 4
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute(BufferGeometryAttribute.Position, new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute(BufferGeometryAttribute.Color, new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
