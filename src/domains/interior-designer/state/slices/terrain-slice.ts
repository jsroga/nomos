import type { StateCreator } from 'zustand'
import {
  INTERACTION_MODE_SELECT,
  INTERACTION_MODE_TERRAIN,
} from '@/domains/interior-designer/constants/interaction-modes'
import { TerrainSliceLog } from '@/domains/interior-designer/constants/terrain-slice-log'
import {
  TerrainBrushTypeValue,
  TerrainMaterialTypeValue,
} from '@/domains/interior-designer/constants/terrain-defaults'
import type { InteriorState } from '../interior-state'
import type {
  GridResolution,
  TerrainBrushType,
  TerrainMaterialType,
  TerrainQuality,
} from '../../core/interior-types'
import {
  GRID_RESOLUTION_MAP,
  TERRAIN_WORLD_SIZE,
  createDefaultTerrainBrush,
  createDefaultTerrainMaterialPaint,
  createDefaultTerrainSettings,
} from '../interior-store-constants'

export type TerrainSlice = Pick<
  InteriorState,
  | 'terrainSettings'
  | 'terrainBrush'
  | 'terrainMaterialPaint'
  | 'terrainBrushPosition'
  | 'setTerrainMode'
  | 'setBaseGroundHeight'
  | 'setWaterSurfaceHeight'
  | 'setShowWaterPlane'
  | 'setGridResolution'
  | 'setTerrainQuality'
  | 'setTerrainBrushType'
  | 'setTerrainBrushSize'
  | 'setTerrainBrushStrength'
  | 'setTerrainBrushFidelity'
  | 'setTerrainBrushPixelate'
  | 'setTerrainMaterial'
  | 'setTerrainBrushPosition'
  | 'setGroundColor'
  | 'setWaterColor'
  | 'setWaterOpacity'
  | 'setSunAngle'
  | 'initializeHeightmap'
  | 'updateHeightmapAt'
  | 'autoFillWaterBelowLevel'
  | 'paintMaterialAt'
  | 'resetTerrain'
>

export const createTerrainSlice: StateCreator<InteriorState, [], [], TerrainSlice> = (set, get) => ({
  terrainSettings: createDefaultTerrainSettings(),
  terrainBrush: createDefaultTerrainBrush(),
  terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
  terrainBrushPosition: null,

  setTerrainMode: (enabled: boolean) => {
    console.log(`${TerrainSliceLog.SetTerrainMode} ${enabled}`)
    set({ mode: enabled ? INTERACTION_MODE_TERRAIN : INTERACTION_MODE_SELECT })
  },

  setBaseGroundHeight: (height: number) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, baseGroundHeight: height },
      hasUnsavedChanges: true,
    })),

  setWaterSurfaceHeight: (height: number) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, waterSurfaceHeight: height },
      hasUnsavedChanges: true,
    })),

  setShowWaterPlane: (show: boolean) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, showWaterPlane: show },
    })),

  setGridResolution: (resolution: GridResolution) => {
    const size = GRID_RESOLUTION_MAP[resolution]
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        gridResolution: resolution,
        heightmapSize: size,
        heightmap: new Float32Array(size * size).fill(state.terrainSettings.baseGroundHeight),
        heightmapVersion: state.terrainSettings.heightmapVersion + 1,
        materialMap: new Uint8Array(size * size).fill(0),
      },
      hasUnsavedChanges: true,
    }))
  },

  setTerrainQuality: (quality: TerrainQuality) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, quality },
      hasUnsavedChanges: true,
    })),

  setTerrainBrushType: (type: TerrainBrushType) =>
    set(state => ({
      terrainBrush: { ...state.terrainBrush, type },
    })),

  setTerrainBrushSize: (size: number) =>
    set(state => ({
      terrainBrush: { ...state.terrainBrush, size: Math.max(1, Math.min(50, size)) },
    })),

  setTerrainBrushStrength: (strength: number) =>
    set(state => ({
      terrainBrush: { ...state.terrainBrush, strength: Math.max(1, Math.min(20, strength)) },
    })),

  setTerrainBrushFidelity: (fidelity: number) =>
    set(state => ({
      terrainBrush: { ...state.terrainBrush, fidelity: Math.max(1, Math.min(10, fidelity)) },
    })),

  setTerrainBrushPixelate: (pixelate: boolean) =>
    set(state => ({
      terrainBrush: { ...state.terrainBrush, pixelate },
    })),

  setTerrainMaterial: (material: TerrainMaterialType) =>
    set(state => ({
      terrainMaterialPaint: { ...state.terrainMaterialPaint, activeMaterial: material },
    })),

  setTerrainBrushPosition: (position: [number, number, number] | null) =>
    set({
      terrainBrushPosition: position,
    }),

  setGroundColor: (color: string) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, groundColor: color },
    })),

  setWaterColor: (color: string) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, waterColor: color },
    })),

  setWaterOpacity: (opacity: number) =>
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        waterOpacity: Math.max(0, Math.min(1, opacity)),
      },
    })),

  setSunAngle: (angle: number) =>
    set(state => ({
      terrainSettings: { ...state.terrainSettings, sunAngle: angle % 360 },
    })),

  initializeHeightmap: (size: number) => {
    console.log(`${TerrainSliceLog.InitializeHeightmap}${size}`)
    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmapSize: size,
        heightmap: new Float32Array(size * size).fill(state.terrainSettings.baseGroundHeight),
        heightmapVersion: 0,
        materialMap: new Uint8Array(size * size).fill(0),
      },
      hasUnsavedChanges: true,
    }))
  },

  updateHeightmapAt: (
    x: number,
    z: number,
    radius: number,
    delta: number,
    brushType: TerrainBrushType
  ) => {
    const state = get()
    const { heightmapSize, heightmap } = state.terrainSettings

    if (!heightmap) return

    const gridX = Math.floor((x + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
    const gridZ = Math.floor((z + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
    const gridRadius = Math.ceil(radius * (heightmapSize / TERRAIN_WORLD_SIZE))

    for (let dz = -gridRadius; dz <= gridRadius; dz++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const px = gridX + dx
        const pz = gridZ + dz

        if (px < 0 || px >= heightmapSize || pz < 0 || pz >= heightmapSize) continue

        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist > gridRadius) continue

        const falloff = 1 - dist / gridRadius
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

        if (state.terrainBrush.pixelate) {
          const stepSize = 5.0 / state.terrainBrush.fidelity
          const snappedHeight = Math.round(heightmap[idx] / stepSize) * stepSize
          heightmap[idx] = snappedHeight
        }
      }
    }

    set(state => ({
      terrainSettings: {
        ...state.terrainSettings,
        heightmapVersion: state.terrainSettings.heightmapVersion + 1,
      },
      hasUnsavedChanges: true,
    }))
  },

  autoFillWaterBelowLevel: () =>
    set(state => {
      const { heightmapSize, heightmap, waterSurfaceHeight } = state.terrainSettings

      if (!heightmap) return {}

      const newMaterialMap = new Uint8Array(heightmapSize * heightmapSize)

      for (let i = 0; i < heightmap.length; i++) {
        newMaterialMap[i] = heightmap[i] < waterSurfaceHeight ? 1 : 0
      }

      return {
        terrainSettings: { ...state.terrainSettings, materialMap: newMaterialMap },
        hasUnsavedChanges: true,
      }
    }),

  paintMaterialAt: (x: number, z: number, radius: number, material: TerrainMaterialType) => {
    const state = get()
    const { heightmapSize, materialMap } = state.terrainSettings

    if (!materialMap) return

    const newMaterialMap = new Uint8Array(materialMap)
    const gridX = Math.floor((x + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
    const gridZ = Math.floor((z + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE))
    const gridRadius = Math.ceil(radius * (heightmapSize / TERRAIN_WORLD_SIZE))
    const materialValue = material === TerrainMaterialTypeValue.Water ? 1 : 0

    for (let dz = -gridRadius; dz <= gridRadius; dz++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const px = gridX + dx
        const pz = gridZ + dz

        if (px < 0 || px >= heightmapSize || pz < 0 || pz >= heightmapSize) continue

        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist > gridRadius) continue

        const idx = pz * heightmapSize + px
        newMaterialMap[idx] = materialValue
      }
    }

    set(state => ({
      terrainSettings: { ...state.terrainSettings, materialMap: newMaterialMap },
      hasUnsavedChanges: true,
    }))
  },

  resetTerrain: () =>
    set(() => ({
      terrainSettings: createDefaultTerrainSettings(),
      terrainBrush: createDefaultTerrainBrush(),
      terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
      terrainBrushPosition: null,
      hasUnsavedChanges: true,
    })),
})
