/**
 * Terrain-specific store - extracted from useInteriorStore for better performance
 *
 * This store manages:
 * - Heightmap data (Float32Array)
 * - Material map (Uint8Array)
 * - Terrain settings (quality, colors, etc.)
 * - Brush settings for sculpting
 *
 * By separating terrain state, components that only need terrain data
 * won't re-render when other interior state changes.
 */
import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'

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

interface TerrainState {
  // Settings
  terrainSettings: TerrainSettings
  brushSettings: TerrainBrushSettings
  materialPaintSettings: TerrainMaterialPaintSettings

  // Actions
  setTerrainSettings: (settings: Partial<TerrainSettings>) => void
  setBrushSettings: (settings: Partial<TerrainBrushSettings>) => void
  setMaterialPaintSettings: (settings: Partial<TerrainMaterialPaintSettings>) => void

  // Heightmap operations
  initializeHeightmap: (size: number) => void
  updateHeightmapAt: (
    x: number,
    z: number,
    brushSize: number,
    strength: number,
    operation: TerrainBrushType,
    fidelity?: number,
    pixelate?: boolean
  ) => void
  setHeightmapFromArray: (data: number[], size: number) => void

  // Material map operations
  paintMaterialAt: (x: number, z: number, brushSize: number, material: TerrainMaterialType) => void
  setMaterialMapFromArray: (data: number[], size: number) => void

  // Reset
  resetTerrain: () => void
}

const DEFAULT_HEIGHTMAP_SIZE = 64

const defaultTerrainSettings: TerrainSettings = {
  baseGroundHeight: 0,
  waterSurfaceHeight: -3,
  showWaterPlane: false,
  gridResolution: 'medium',
  quality: 'medium',
  groundColor: '#4a7c59',
  waterColor: '#06b6d4',
  waterOpacity: 0.4,
  sunAngle: 45,
  heightmapSize: DEFAULT_HEIGHTMAP_SIZE,
  heightmap: null,
  heightmapVersion: 0,
  materialMap: null,
}

const defaultBrushSettings: TerrainBrushSettings = {
  type: 'raise',
  size: 5,
  strength: 5,
  fidelity: 5,
  pixelate: false,
  position: null,
}

const defaultMaterialPaintSettings: TerrainMaterialPaintSettings = {
  activeMaterial: 'ground',
}

export const useTerrainStore = create<TerrainState>()((set, get) => ({
  terrainSettings: defaultTerrainSettings,
  brushSettings: defaultBrushSettings,
  materialPaintSettings: defaultMaterialPaintSettings,

  setTerrainSettings: settings =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, ...settings },
    })),

  setBrushSettings: settings =>
    set(state => ({
      brushSettings: { ...state.brushSettings, ...settings },
    })),

  setMaterialPaintSettings: settings =>
    set(state => ({
      materialPaintSettings: { ...state.materialPaintSettings, ...settings },
    })),

  initializeHeightmap: size => {
    const heightmap = new Float32Array(size * size)
    const materialMap = new Uint8Array(size * size)
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmapSize: size,
        heightmap,
        materialMap,
        heightmapVersion: state.terrainSettings.heightmapVersion + 1,
      },
    }))
  },

  updateHeightmapAt: (x, z, brushSize, strength, operation, fidelity = 5, pixelate = false) => {
    const state = get()
    const { heightmap, heightmapSize, baseGroundHeight, heightmapVersion } = state.terrainSettings

    if (!heightmap) return

    // Clone the heightmap for immutable update
    const newHeightmap = new Float32Array(heightmap)
    const halfBrush = brushSize / 2
    const strengthFactor = strength * 0.1

    // Calculate affected grid cells
    const minGx = Math.max(
      0,
      Math.floor((x - halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const maxGx = Math.min(
      heightmapSize - 1,
      Math.ceil((x + halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const minGz = Math.max(
      0,
      Math.floor((z - halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const maxGz = Math.min(
      heightmapSize - 1,
      Math.ceil((z + halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const idx = gz * heightmapSize + gx
        const cellX = (gx - heightmapSize / 2) * (64 / heightmapSize)
        const cellZ = (gz - heightmapSize / 2) * (64 / heightmapSize)
        const dist = Math.sqrt((cellX - x) ** 2 + (cellZ - z) ** 2)

        if (dist > halfBrush) continue

        // Falloff based on distance from center
        const falloff = 1 - dist / halfBrush
        const adjustedStrength = strengthFactor * falloff

        switch (operation) {
          case 'raise':
            newHeightmap[idx] += adjustedStrength
            break
          case 'lower':
            newHeightmap[idx] -= adjustedStrength
            break
          case 'flatten':
            newHeightmap[idx] =
              newHeightmap[idx] * (1 - adjustedStrength) + baseGroundHeight * adjustedStrength
            break
          case 'smooth': {
            // Average with neighbors
            let sum = 0
            let count = 0
            for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                const nx = gx + dx
                const nz = gz + dz
                if (nx >= 0 && nx < heightmapSize && nz >= 0 && nz < heightmapSize) {
                  sum += heightmap[nz * heightmapSize + nx]
                  count++
                }
              }
            }
            const avg = sum / count
            newHeightmap[idx] = newHeightmap[idx] * (1 - adjustedStrength) + avg * adjustedStrength
            break
          }
        }

        // Apply pixelation if enabled
        if (pixelate) {
          const step = 1 / fidelity
          newHeightmap[idx] = Math.round(newHeightmap[idx] / step) * step
        }
      }
    }

    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmap: newHeightmap,
        heightmapVersion: heightmapVersion + 1,
      },
    }))
  },

  setHeightmapFromArray: (data, size) => {
    const heightmap = new Float32Array(data)
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmapSize: size,
        heightmap,
        heightmapVersion: state.terrainSettings.heightmapVersion + 1,
      },
    }))
  },

  paintMaterialAt: (x, z, brushSize, material) => {
    const state = get()
    const { materialMap, heightmapSize } = state.terrainSettings

    if (!materialMap) return

    const newMaterialMap = new Uint8Array(materialMap)
    const halfBrush = brushSize / 2
    const materialValue = material === 'water' ? 1 : 0

    const minGx = Math.max(
      0,
      Math.floor((x - halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const maxGx = Math.min(
      heightmapSize - 1,
      Math.ceil((x + halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const minGz = Math.max(
      0,
      Math.floor((z - halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )
    const maxGz = Math.min(
      heightmapSize - 1,
      Math.ceil((z + halfBrush) / (64 / heightmapSize) + heightmapSize / 2)
    )

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gz = minGz; gz <= maxGz; gz++) {
        const cellX = (gx - heightmapSize / 2) * (64 / heightmapSize)
        const cellZ = (gz - heightmapSize / 2) * (64 / heightmapSize)
        const dist = Math.sqrt((cellX - x) ** 2 + (cellZ - z) ** 2)

        if (dist <= halfBrush) {
          newMaterialMap[gz * heightmapSize + gx] = materialValue
        }
      }
    }

    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        materialMap: newMaterialMap,
      },
    }))
  },

  setMaterialMapFromArray: (data, size) => {
    const materialMap = new Uint8Array(data)
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmapSize: size,
        materialMap,
      },
    }))
  },

  resetTerrain: () => {
    set({
      terrainSettings: defaultTerrainSettings,
      brushSettings: defaultBrushSettings,
      materialPaintSettings: defaultMaterialPaintSettings,
    })
  },
}))

// Optimized selectors for common access patterns
export const useTerrainSettings = () => useTerrainStore(useShallow(s => s.terrainSettings))
export const useBrushSettings = () => useTerrainStore(useShallow(s => s.brushSettings))
export const useHeightmapVersion = () => useTerrainStore(s => s.terrainSettings.heightmapVersion)
export const useHeightmap = () => useTerrainStore(s => s.terrainSettings.heightmap)
