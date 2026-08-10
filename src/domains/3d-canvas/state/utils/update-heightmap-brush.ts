import { TerrainBrushTypeValue } from '../../constants/terrain-defaults'
import type { TerrainBrushType } from '../../core/interior-types'

export function applyHeightmapBrush(
  heightmap: Float32Array,
  heightmapSize: number,
  px: number,
  pz: number,
  gridX: number,
  gridZ: number,
  delta: number,
  falloff: number,
  brushType: TerrainBrushType
): void {
  const idx = pz * heightmapSize + px

  switch (brushType) {
    case TerrainBrushTypeValue.Raise:
      heightmap[idx] += delta * falloff
      break
    case TerrainBrushTypeValue.Lower:
      heightmap[idx] -= delta * falloff
      break
    case TerrainBrushTypeValue.Flatten: {
      const centerIdx = gridZ * heightmapSize + gridX
      const targetHeight = heightmap[centerIdx]
      heightmap[idx] = heightmap[idx] + (targetHeight - heightmap[idx]) * falloff * 0.5
      break
    }
    case TerrainBrushTypeValue.Smooth: {
      let sum = 0
      let count = 0
      for (let sy = -1; sy <= 1; sy++) {
        for (let sx = -1; sx <= 1; sx++) {
          const nx = px + sx
          const nz = pz + sy
          if (nx >= 0 && nx < heightmapSize && nz >= 0 && nz < heightmapSize) {
            sum += heightmap[nz * heightmapSize + nx]
            count++
          }
        }
      }
      if (count > 0) {
        heightmap[idx] = heightmap[idx] + (sum / count - heightmap[idx]) * falloff * 0.3
      }
      break
    }
  }
}

export function snapHeightmapPixel(
  heightmap: Float32Array,
  idx: number,
  fidelity: number
): void {
  const stepSize = 5.0 / fidelity
  const snappedHeight = Math.round(heightmap[idx] / stepSize) * stepSize
  heightmap[idx] = snappedHeight
}

export function stampHeightmapBrush(params: {
  heightmap: Float32Array
  heightmapSize: number
  gridX: number
  gridZ: number
  gridRadius: number
  delta: number
  brushType: TerrainBrushType
  pixelate: boolean
  fidelity: number
}): void {
  const {
    heightmap,
    heightmapSize,
    gridX,
    gridZ,
    gridRadius,
    delta,
    brushType,
    pixelate,
    fidelity,
  } = params

  for (let dz = -gridRadius; dz <= gridRadius; dz++) {
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      const px = gridX + dx
      const pz = gridZ + dz

      if (px < 0 || px >= heightmapSize || pz < 0 || pz >= heightmapSize) continue

      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > gridRadius) continue

      const falloff = 1 - dist / gridRadius
      applyHeightmapBrush(heightmap, heightmapSize, px, pz, gridX, gridZ, delta, falloff, brushType)

      if (pixelate) {
        const idx = pz * heightmapSize + px
        snapHeightmapPixel(heightmap, idx, fidelity)
      }
    }
  }
}
