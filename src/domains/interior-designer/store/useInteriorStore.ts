import { create } from 'zustand'
import { useShallow } from 'zustand/shallow'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import * as THREE from 'three'

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

// Terrain & Water Mode Types
export type TerrainBrushType = 'raise' | 'lower' | 'flatten' | 'smooth'
export type TerrainMaterialType = 'ground' | 'water'
export type GridResolution = 'low' | 'medium' | 'high'
export type TerrainQuality = 'low' | 'medium' | 'high'

// Quality preset resolution values (vertices per meter)
export const TERRAIN_QUALITY_RESOLUTION: Record<TerrainQuality, number> = {
  low: 8,
  medium: 16,
  high: 40,
}

export interface TerrainSettings {
  // Global Levels
  baseGroundHeight: number // Default 0m
  waterSurfaceHeight: number // Default -3m
  showWaterPlane: boolean
  gridResolution: GridResolution
  quality: TerrainQuality // Mesh resolution quality preset

  // Colors
  groundColor: string // Hex color for terrain (default: #4a7c59)
  waterColor: string // Hex color for water (default: #06b6d4)
  waterOpacity: number // 0-1 (default: 0.4)

  // Lighting
  sunAngle: number // 0-360 degrees, controls directional light rotation

  // Heightmap data - 2D array of heights
  heightmapSize: number // Grid size (e.g., 64 = 64x64 grid)
  heightmap: Float32Array | null // Stored as flat array
  heightmapVersion: number // Incremented on heightmap changes to trigger reactive updates

  // Material map - which cells are water vs ground
  materialMap: Uint8Array | null // 0 = ground, 1 = water (manual override)
}

export interface TerrainBrushSettings {
  type: TerrainBrushType
  size: number // 1-50
  strength: number // 1-20
  fidelity: number // 1-10, controls detail/resolution of sculpted area
  pixelate: boolean // true = voxel-like stepped effect
  position: [number, number, number] | null // 3D world position for brush preview
}

export interface TerrainMaterialPaintSettings {
  activeMaterial: TerrainMaterialType
}

export interface Surface {
  id: string
  type: SurfaceType
  points: [number, number, number][] // Control points
  isPath: boolean // true = Line/Path, false = Polygon/Area
  curved: boolean // true = Spline interpolation
  width?: number // for paths
  layerIndex: number // for z-index sorting
  texture?: string
  textureScale?: number
  roughness?: number
  metalness?: number
  roundness?: number // 0..1 curve tension
  height?: number // for vertical surfaces
  isVertical?: boolean // true = Wall-like surface
  rotation?: [number, number, number] // Euler rotation
  level?: number // Building level/floor (0 = ground)
}

export interface Wall {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  height: number
  thickness: number
  texture?: string
  level?: number // Building level/floor (0 = ground)
}

export interface Floor {
  id: string
  points: [number, number, number][] // Polygon vertices
  y: number
  texture?: string
  level?: number // Building level/floor (0 = ground)
}

export interface Water {
  id: string
  points: [number, number, number][] // Polygon vertices
  y: number
}

export type ObjectType = 'generic' | 'window' | 'door'

export interface SceneObject {
  id: string
  modelUrl: string // or primitive type like 'cube', 'sphere', 'window', 'door', or 'asset:id'
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  objectType?: ObjectType // Type discriminator for windows/doors
  color?: string // Hex color for primitive shapes
  groupId?: string // Reference to ObjectGroup for grouped movement
  isLoading?: boolean // True while GLB is being fetched
  thumbnailUrl?: string // Preview image for loading state
  targetDimensions?: [number, number, number] // If set, model will be auto-scaled to these world dimensions on load
  level?: number // Building level/floor (0 = ground)
}

export interface ObjectGroup {
  id: string
  name: string
}

export interface InteriorState {
  mode: InteractionMode
  walls: Wall[]
  // Legacy support (to be migrated/removed)
  floors: Floor[]
  water: Water[]

  // New Unified System
  surfaces: Surface[]

  objects: SceneObject[]
  groups: ObjectGroup[]
  selectedId: string | null
  multiSelectedIds: string[]
  activeLevel: number
  activeModelUrl: string
  // Surface Tool State
  activeSurfaceType: SurfaceType
  isCurved: boolean

  exportRequested: boolean
  cameraResetRequested: boolean
  zenMode: boolean

  // Persistence
  currentDesignId: string | null
  currentDesignName: string | null
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean

  // Object Controls
  lockY: boolean
  snapEnabled: boolean
  snapSize: number
  transformMode: 'translate' | 'rotate' | 'scale'
  setLockY: (locked: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setSnapSize: (size: number) => void
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void

  // Retexture Export (for converting walls/objects to GLB)
  requestRetextureExport: boolean
  retextureModelBase64: string | null
  setRequestRetextureExport: (requested: boolean) => void
  setRetextureModelBase64: (base64: string | null) => void

  // Retexture Actions (now managed via GlobalStatusStore)
  previewRetexture: (elementId: string, retexturedUrl: string) => void
  revertRetexture: (elementId: string) => void
  approveRetexture: (elementId: string) => void
  cancelRetexture: (elementId: string) => void

  // Terrain & Water Mode State
  terrainSettings: TerrainSettings
  terrainBrush: TerrainBrushSettings
  terrainMaterialPaint: TerrainMaterialPaintSettings
  terrainBrushPosition: [number, number, number] | null // Current brush position for preview

  // Terrain & Water Mode Actions
  setTerrainMode: (enabled: boolean) => void
  setBaseGroundHeight: (height: number) => void
  setWaterSurfaceHeight: (height: number) => void
  setShowWaterPlane: (show: boolean) => void
  setGridResolution: (resolution: GridResolution) => void
  setTerrainQuality: (quality: TerrainQuality) => void
  setTerrainBrushType: (type: TerrainBrushType) => void
  setTerrainBrushSize: (size: number) => void
  setTerrainBrushStrength: (strength: number) => void
  setTerrainBrushFidelity: (fidelity: number) => void
  setTerrainBrushPixelate: (pixelate: boolean) => void
  setTerrainMaterial: (material: TerrainMaterialType) => void
  setTerrainBrushPosition: (position: [number, number, number] | null) => void
  setGroundColor: (color: string) => void
  setWaterColor: (color: string) => void
  setWaterOpacity: (opacity: number) => void
  setSunAngle: (angle: number) => void
  initializeHeightmap: (size: number) => void
  updateHeightmapAt: (
    x: number,
    z: number,
    radius: number,
    delta: number,
    brushType: TerrainBrushType
  ) => void
  autoFillWaterBelowLevel: () => void
  paintMaterialAt: (x: number, z: number, radius: number, material: TerrainMaterialType) => void
  resetTerrain: () => void
  resetInterior: () => void

  // Actions
  setMode: (mode: InteractionMode) => void
  setActiveLevel: (level: number) => void
  setActiveModelUrl: (url: string) => void
  setActiveSurfaceType: (type: SurfaceType) => void
  setIsCurved: (curved: boolean) => void
  setExportRequested: (requested: boolean) => void
  setCameraResetRequested: (requested: boolean) => void
  setZenMode: (enabled: boolean) => void
  toggleZenMode: () => void
  addWall: (wall: Omit<Wall, 'id'>) => void
  updateWall: (id: string, updates: Partial<Wall>) => void
  removeWall: (id: string) => void

  addFloor: (floor: Omit<Floor, 'id'>) => void
  updateFloor: (id: string, updates: Partial<Floor>) => void
  removeFloor: (id: string) => void

  addWater: (water: Omit<Water, 'id'>) => void
  updateWater: (id: string, updates: Partial<Water>) => void
  removeWater: (id: string) => void

  // Surface Actions
  addSurface: (surface: Omit<Surface, 'id'>) => void
  updateSurface: (id: string, updates: Partial<Surface>) => void
  removeSurface: (id: string) => void

  addObject: (obj: Omit<SceneObject, 'id'>) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  removeObject: (id: string) => void

  setSelected: (id: string | null) => void
  toggleMultiSelect: (id: string) => void
  clearMultiSelect: () => void
  combineWalls: (options?: { roundness?: number }) => void
  createFloorFromSurface: (id: string) => void

  // Group Actions
  createGroup: (name: string, objectIds: string[]) => string
  addToGroup: (groupId: string, objectId: string) => void
  removeFromGroup: (objectId: string) => void
  deleteGroup: (groupId: string) => void
  selectGroup: (groupId: string) => void

  // Persistence actions

  // Persistence actions
  saveDesign: (projectId: string, name?: string) => Promise<void>
  loadDesign: (designId: string) => Promise<void>
  renameDesign: (designId: string, newName: string) => Promise<void>
  deleteDesign: (designId: string) => Promise<void>
  newDesign: () => void
  markUnsaved: () => void
}

import { temporal } from 'zundo'

const TERRAIN_WORLD_SIZE = 64

// Surface types that affect the heightmap (ground surfaces)
const GROUND_SURFACE_TYPES: SurfaceType[] = ['grass', 'dirt', 'sand', 'rock', 'mars']

// Point-in-polygon test using ray casting algorithm
const isPointInPolygon = (x: number, z: number, polygon: Array<[number, number]>): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Helper function to create default terrain settings
const createDefaultTerrainSettings = (): TerrainSettings => ({
  baseGroundHeight: 0,
  waterSurfaceHeight: -3,
  showWaterPlane: true,
  gridResolution: 'medium',
  quality: 'medium',
  groundColor: '#4a7c59',
  waterColor: '#06b6d4',
  waterOpacity: 0.4,
  sunAngle: 45, // 45 degrees default
  heightmapSize: 64,
  heightmap: null,
  heightmapVersion: 0,
  materialMap: null,
})

const createDefaultTerrainBrush = (): TerrainBrushSettings => ({
  type: 'raise',
  size: 20,
  strength: 10,
  fidelity: 50,
  pixelate: false,
  position: null,
})

const createDefaultTerrainMaterialPaint = (): TerrainMaterialPaintSettings => ({
  activeMaterial: 'ground',
})

// Grid resolution to size mapping
const GRID_RESOLUTION_MAP: Record<GridResolution, number> = {
  low: 32,
  medium: 64,
  high: 128,
}

export const useInteriorStore = create<InteriorState>()(
  persist(
    temporal(
      (set, get) => ({
        mode: 'SELECT',
        walls: [],
        floors: [],
        water: [],
        surfaces: [],
        objects: [],
        groups: [],
        selectedId: null,
        multiSelectedIds: [],
        activeLevel: 0,
        activeModelUrl: 'cube',
        activeSurfaceType: 'road',
        isCurved: true,
        exportRequested: false,
        cameraResetRequested: false,
        zenMode: false,

        // Terrain & Water Mode Initial State
        terrainSettings: createDefaultTerrainSettings(),
        terrainBrush: createDefaultTerrainBrush(),
        terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
        terrainBrushPosition: null,

        // Terrain & Water Mode Actions
        setTerrainMode: (enabled: boolean) => {
          console.log(`[InteriorStore] setTerrainMode: ${enabled}`)
          set({ mode: enabled ? 'TERRAIN' : 'SELECT' })
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
          console.log(`[InteriorStore] initializeHeightmap: size=${size}`)
          set(state => ({
            terrainSettings: {
              ...state.terrainSettings,
              heightmapSize: size,
              heightmap: new Float32Array(size * size).fill(state.terrainSettings.baseGroundHeight),
              heightmapVersion: 0, // Initialize version
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
          const { heightmapSize, heightmap, baseGroundHeight } = state.terrainSettings

          if (!heightmap) return

          // console.log(`[InteriorStore] updateHeightmapAt: brush=${brushType} pos=(${x.toFixed(2)},${z.toFixed(2)}) r=${radius}`)

          // Direct mutation of the heightmap array
          const gridX = Math.floor(
            (x + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE)
          )
          const gridZ = Math.floor(
            (z + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE)
          )
          const gridRadius = Math.ceil(radius * (heightmapSize / TERRAIN_WORLD_SIZE))

          let minHeight = Infinity
          let maxHeight = -Infinity

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
                case 'raise':
                  heightmap[idx] += delta * falloff
                  break
                case 'lower':
                  heightmap[idx] -= delta * falloff
                  break
                case 'flatten':
                  // Flatten to the height at the center point
                  const centerIdx = gridZ * heightmapSize + gridX
                  const targetHeight = heightmap[centerIdx]
                  heightmap[idx] = heightmap[idx] + (targetHeight - heightmap[idx]) * falloff * 0.5
                  break
                case 'smooth':
                  // Average with neighbors
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

              // Apply pixelate (voxel) effect - snap to discrete steps for Minecraft-like terrain
              if (state.terrainBrush.pixelate) {
                // Minecraft-style: fidelity 1 = 5m steps (huge plateaus), fidelity 100 = 0.05m steps (fine)
                const stepSize = 5.0 / state.terrainBrush.fidelity
                const snappedHeight = Math.round(heightmap[idx] / stepSize) * stepSize
                heightmap[idx] = snappedHeight
              }

              minHeight = Math.min(minHeight, heightmap[idx])
              maxHeight = Math.max(maxHeight, heightmap[idx])
            }
          }

          // Only log significant updates to avoid spam
          if (brushType !== 'smooth') {
            // console.log(`[InteriorStore] Heightmap updated. Range: ${minHeight.toFixed(2)} to ${maxHeight.toFixed(2)}`)
          }

          // Increment heightmapVersion to trigger reactivity
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
              // If height is below water surface, mark as water
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
          const gridX = Math.floor(
            (x + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE)
          )
          const gridZ = Math.floor(
            (z + TERRAIN_WORLD_SIZE / 2) * (heightmapSize / TERRAIN_WORLD_SIZE)
          )
          const gridRadius = Math.ceil(radius * (heightmapSize / TERRAIN_WORLD_SIZE))
          const materialValue = material === 'water' ? 1 : 0

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
          set(state => ({
            terrainSettings: createDefaultTerrainSettings(),
            terrainBrush: createDefaultTerrainBrush(),
            terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
            terrainBrushPosition: null,
            hasUnsavedChanges: true,
          })),

        resetInterior: () =>
          set(state => ({
            mode: 'SELECT',
            walls: [],
            floors: [],
            water: [],
            surfaces: [],
            objects: [],
            selectedId: null,
            multiSelectedIds: [],
            activeLevel: 0,
            activeModelUrl: 'cube',
            activeSurfaceType: 'road',
            isCurved: true,
            currentDesignId: null,
            currentDesignName: null,
            hasUnsavedChanges: false,
            lastSaved: null,
            // Reset terrain as well? Maybe optional. Yes, "start from blank" implies blank terrain too.
            terrainSettings: createDefaultTerrainSettings(),
            terrainBrush: createDefaultTerrainBrush(),
            terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
          })),

        // Retexture Actions (integrated with GlobalStatusStore)
        previewRetexture: (elementId: string, retexturedUrl: string) =>
          set(state => {
            const { objects, walls, surfaces } = state

            // Check if it's an object
            const object = objects.find(o => o.id === elementId)
            if (object) {
              // Backup original state if not already in operation?
              // We rely on the operation having 'originalModelUrl' set during init.
              // Just update the object model
              return {
                objects: objects.map(o =>
                  o.id === elementId ? { ...o, modelUrl: retexturedUrl } : o
                ),
                hasUnsavedChanges: true,
              }
            }

            // Check if it's a wall
            const wall = walls.find(w => w.id === elementId)
            if (wall) {
              // It's a wall! We need to convert it to an object for preview.
              // AND we must save the wall data to the operation so we can revert it.
              // We can't easily update the operation from here without circular dependency issues
              // if we try to write to GlobalStatusStore.
              // BUT we can assume PropertiesPanel handles the metadata update?
              // Or better: We store the "revert" data in the *InteriorStore* temporarily?
              // No, persist it in the operation is safest.
              // Let's rely on PropertiesPanel to save the wall data before calling this?
              // Actually, let's just do the DOM change here.

              const midX = (wall.start[0] + wall.end[0]) / 2
              const midZ = (wall.start[2] + wall.end[2]) / 2
              const rotationY = Math.atan2(wall.end[0] - wall.start[0], wall.end[2] - wall.start[2])

              const dx = wall.end[0] - wall.start[0]
              const dz = wall.end[2] - wall.start[2]
              const length = Math.sqrt(dx * dx + dz * dz)
              const thickness = wall.thickness || 0.2 // Default thickness

              // Rotation aligns with Z axis (atan2(dx, dz) where 0 means +Z)
              // So Z scale should be Length.
              // X scale should be Thickness.
              // Y scale is Height.

              const newObject: SceneObject = {
                id: wall.id, // Keep same ID so selection works
                modelUrl: retexturedUrl,
                position: [midX, wall.start[1], midZ],
                rotation: [0, rotationY, 0],
                scale: [1, 1, 1], // Reset scale to 1, rely on targetDimensions
                targetDimensions: [thickness, wall.height, length],
                isLoading: false,
              }

              return {
                walls: walls.filter(w => w.id !== elementId),
                objects: [...objects, newObject],
                hasUnsavedChanges: true,
              }
            }

            // Check if it's a surface (combined walls, roads, etc.)
            const surface = surfaces.find(s => s.id === elementId)
            if (surface) {
              // Add preview object WITHOUT removing surface (surface stays visible during load)
              // Try to get the original bounding box center from the operation
              const operation = useGlobalStatusStore
                .getState()
                .operations.find(op => op.id === `retexture-${elementId}`)
              let centerX: number,
                centerZ: number,
                width: number,
                depth: number,
                minY: number = 0

              try {
                const metadata = JSON.parse(operation?.details || '{}')
                const bbox = metadata.originalBoundingBox

                if (bbox && bbox.center) {
                  // Use the actual bounding box center from the exported geometry
                  centerX = bbox.center[0]
                  centerZ = bbox.center[2]
                  width = bbox.size[0]
                  depth = bbox.size[2]
                  minY = bbox.min ? bbox.min[1] : 0 // Get original minY if available
                  console.log('[previewRetexture] Using original bounding box:', {
                    center: bbox.center,
                    size: bbox.size,
                    min: bbox.min,
                    max: bbox.max,
                    calculatedPosition: [centerX, minY, centerZ],
                  })
                } else {
                  throw new Error('No bounding box in metadata, fallback to surface points')
                }
              } catch (e) {
                // Fallback: Calculate bounding box center from surface points
                console.log('[previewRetexture] Falling back to surface point calculation')
                const xs = surface.points.map(p => p[0])
                const zs = surface.points.map(p => p[2])
                const minX = Math.min(...xs)
                const maxX = Math.max(...xs)
                const minZ = Math.min(...zs)
                const maxZ = Math.max(...zs)
                centerX = (minX + maxX) / 2
                centerZ = (minZ + maxZ) / 2
                width = maxX - minX
                depth = maxZ - minZ
              }

              const height = surface.height || 3

              // Use a preview ID so we can identify it later
              const previewId = `preview-${surface.id}`

              // Remove any existing preview for this surface
              const filteredObjects = objects.filter(o => o.id !== previewId)

              // Position at centerX/Z, and minY (usually 0 for walls starting at ground)
              // GLBModel will auto-rebase the pivot to bottom-center of the loaded geometry
              const newObject: SceneObject = {
                id: previewId, // Use preview ID
                modelUrl: retexturedUrl,
                position: [centerX, minY, centerZ], // Use minY from original bounding box
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                targetDimensions: [width || 1, height, depth || 1],
                isLoading: true, // Show loading indicator
              }

              console.log('[previewRetexture] Creating preview object:', newObject)

              return {
                // Keep surface visible during preview!
                objects: [...filteredObjects, newObject],
                hasUnsavedChanges: true,
              }
            }

            return {}
          }),

        revertRetexture: (elementId: string) =>
          set(state => {
            // We need to restore original state.
            // Problem: We need the original data (Wall data or Object URL).
            // We can look this up from GlobalStatusStore operation details.
            const operation = useGlobalStatusStore
              .getState()
              .operations.find(op => op.id === `retexture-${elementId}`)
            if (!operation) return {}

            try {
              const metadata = JSON.parse(operation.details || '{}')

              // Case 1: Was a Wall
              if (metadata.originalType === 'wall' && metadata.originalData) {
                const wallData = metadata.originalData as Wall
                // Remove the preview object
                const newObjects = state.objects.filter(o => o.id !== elementId)
                // Restore the wall
                return {
                  objects: newObjects,
                  walls: [...state.walls, wallData],
                  hasUnsavedChanges: true,
                }
              }

              // Case 2: Was a Surface (combined walls, roads, etc.)
              if (metadata.originalType === 'surface' && metadata.originalData) {
                const surfaceData = metadata.originalData as Surface
                // Remove the preview object
                const newObjects = state.objects.filter(o => o.id !== elementId)
                // Restore the surface
                return {
                  objects: newObjects,
                  surfaces: [...state.surfaces, surfaceData],
                  hasUnsavedChanges: true,
                }
              }

              // Case 3: Was an Object
              if (metadata.originalModelUrl) {
                return {
                  objects: state.objects.map(o =>
                    o.id === elementId ? { ...o, modelUrl: metadata.originalModelUrl } : o
                  ),
                  hasUnsavedChanges: true,
                }
              }
            } catch (e) {
              console.error('Failed to revert', e)
            }
            return {}
          }),

        approveRetexture: (elementId: string) =>
          set(state => {
            // Check if there's a preview object to finalize
            const previewId = `preview-${elementId}`
            const previewObject = state.objects.find(o => o.id === previewId)

            if (previewObject) {
              // Surface case: remove surface and rename preview object to original ID
              // Also remove the operation from GlobalStatusStore
              useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
              return {
                surfaces: state.surfaces.filter(s => s.id !== elementId),
                objects: state.objects.map(o => (o.id === previewId ? { ...o, id: elementId } : o)),
                hasUnsavedChanges: true,
              }
            }

            // Just remove the operation for walls/objects (already applied via preview)
            useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
            return {}
          }),

        cancelRetexture: (elementId: string) =>
          set(state => {
            // Remove preview object if exists (surface case)
            const previewId = `preview-${elementId}`
            const hasPreview = state.objects.some(o => o.id === previewId)

            if (hasPreview) {
              useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
              return {
                objects: state.objects.filter(o => o.id !== previewId),
                hasUnsavedChanges: true,
              }
            }

            // Fallback to revert for walls/objects
            get().revertRetexture(elementId)
            useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
            return {}
          }),

        // Retexture Export
        requestRetextureExport: false,
        retextureModelBase64: null,
        setRequestRetextureExport: requested => set({ requestRetextureExport: requested }),
        setRetextureModelBase64: base64 => set({ retextureModelBase64: base64 }),

        // Persistence state
        currentDesignId: null,
        currentDesignName: null,
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,

        markUnsaved: () => set({ hasUnsavedChanges: true }),

        setMode: mode =>
          set(state => ({
            mode,
            // Reset terrain brush when switching away from TERRAIN mode
            terrainBrush:
              state.mode === 'TERRAIN' && mode !== 'TERRAIN'
                ? { ...state.terrainBrush, position: null }
                : state.terrainBrush,
          })),

        setActiveLevel: level =>
          set({ activeLevel: level, selectedId: null, multiSelectedIds: [] }),
        setActiveModelUrl: url => set({ activeModelUrl: url }),
        setActiveSurfaceType: type => set({ activeSurfaceType: type }),
        setIsCurved: curved => set({ isCurved: curved }),
        setExportRequested: requested => set({ exportRequested: requested }),
        setCameraResetRequested: requested => set({ cameraResetRequested: requested }),
        setZenMode: enabled => set({ zenMode: enabled }),
        toggleZenMode: () => set(state => ({ zenMode: !state.zenMode })),

        // Object Controls
        lockY: true,
        snapEnabled: true,
        snapSize: 0.5,
        transformMode: 'translate',
        setLockY: lockY => set({ lockY }),
        setSnapEnabled: snapEnabled => set({ snapEnabled }),
        setSnapSize: snapSize => set({ snapSize }),
        setTransformMode: transformMode => set({ transformMode }),

        addWall: wall =>
          set(state => ({
            walls: [...state.walls, { ...wall, id: uuidv4(), level: state.activeLevel }],
            hasUnsavedChanges: true,
          })),
        updateWall: (id, updates) =>
          set(state => ({
            walls: state.walls.map(w => (w.id === id ? { ...w, ...updates } : w)),
            hasUnsavedChanges: true,
          })),
        removeWall: id =>
          set(state => {
            const wasSelected = state.selectedId === id
            const wasInMultiSelect = state.multiSelectedIds.includes(id)
            return {
              walls: state.walls.filter(w => w.id !== id),
              selectedId: wasSelected ? null : state.selectedId,
              multiSelectedIds: wasInMultiSelect
                ? state.multiSelectedIds.filter(sid => sid !== id)
                : state.multiSelectedIds,
              hasUnsavedChanges: true,
            }
          }),

        addFloor: floor =>
          set(state => ({
            floors: [...state.floors, { ...floor, id: uuidv4(), level: state.activeLevel }],
            hasUnsavedChanges: true,
          })),
        updateFloor: (id, updates) =>
          set(state => ({
            floors: state.floors.map(f => (f.id === id ? { ...f, ...updates } : f)),
            hasUnsavedChanges: true,
          })),
        removeFloor: id =>
          set(state => {
            const wasSelected = state.selectedId === id
            const wasInMultiSelect = state.multiSelectedIds.includes(id)
            return {
              floors: state.floors.filter(f => f.id !== id),
              selectedId: wasSelected ? null : state.selectedId,
              multiSelectedIds: wasInMultiSelect
                ? state.multiSelectedIds.filter(sid => sid !== id)
                : state.multiSelectedIds,
              hasUnsavedChanges: true,
            }
          }),

        addWater: water =>
          set(state => ({
            water: [...state.water, { ...water, id: uuidv4() }],
            hasUnsavedChanges: true,
          })),
        updateWater: (id, updates) =>
          set(state => ({
            water: state.water.map(w => (w.id === id ? { ...w, ...updates } : w)),
            hasUnsavedChanges: true,
          })),
        removeWater: id =>
          set(state => ({
            water: state.water.filter(w => w.id !== id),
            hasUnsavedChanges: true,
          })),

        addSurface: surface =>
          set(state => ({
            surfaces: [
              ...state.surfaces,
              { ...surface, id: uuidv4(), level: state.activeLevel },
            ].sort((a, b) => a.layerIndex - b.layerIndex),
            hasUnsavedChanges: true,
          })),
        updateSurface: (id, updates) =>
          set(state => ({
            surfaces: state.surfaces
              .map(s => (s.id === id ? { ...s, ...updates } : s))
              .sort((a, b) => a.layerIndex - b.layerIndex),
            hasUnsavedChanges: true,
          })),
        removeSurface: id =>
          set(state => {
            // Find the surface being deleted
            const surface = state.surfaces.find(s => s.id === id)

            console.log(
              '[removeSurface] Deleting surface:',
              id,
              'type:',
              surface?.type,
              'points:',
              surface?.points?.length
            )

            // If it's a ground surface, clear the heightmap region
            let newHeightmap = state.terrainSettings.heightmap
            if (
              surface &&
              GROUND_SURFACE_TYPES.includes(surface.type) &&
              surface.points &&
              surface.points.length >= 3 &&
              state.terrainSettings.heightmap
            ) {
              const heightmap = state.terrainSettings.heightmap
              const heightmapSize = state.terrainSettings.heightmapSize
              const baseHeight = state.terrainSettings.baseGroundHeight

              // Create polygon from surface points - X and Z (horizontal plane)
              const polygon: Array<[number, number]> = surface.points.map(p => [p[0], p[2]])

              // Debug: Log polygon bounds
              const minX = Math.min(...polygon.map(p => p[0]))
              const maxX = Math.max(...polygon.map(p => p[0]))
              const minZ = Math.min(...polygon.map(p => p[1]))
              const maxZ = Math.max(...polygon.map(p => p[1]))
              console.log('[removeSurface] Polygon bounds:', { minX, maxX, minZ, maxZ })
              console.log(
                '[removeSurface] Heightmap size:',
                heightmapSize,
                'baseHeight:',
                baseHeight
              )
              console.log('[removeSurface] TERRAIN_WORLD_SIZE:', TERRAIN_WORLD_SIZE)

              // Create a copy of the heightmap
              newHeightmap = new Float32Array(heightmap)

              let clearedCount = 0

              // Iterate through all heightmap cells
              for (let gridZ = 0; gridZ < heightmapSize; gridZ++) {
                for (let gridX = 0; gridX < heightmapSize; gridX++) {
                  // Convert grid coords to world coords
                  const worldX =
                    (gridX / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2
                  const worldZ =
                    (gridZ / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2

                  // If point is inside the deleted surface's polygon, reset to base height
                  if (isPointInPolygon(worldX, worldZ, polygon)) {
                    newHeightmap[gridZ * heightmapSize + gridX] = baseHeight
                    clearedCount++
                  }
                }
              }

              console.log(
                '[removeSurface] Cleared',
                clearedCount,
                'heightmap cells for surface:',
                surface.id,
                surface.type
              )
            } else {
              console.log(
                '[removeSurface] NOT clearing heightmap. isGround:',
                surface ? GROUND_SURFACE_TYPES.includes(surface.type) : false,
                'hasPoints:',
                surface?.points?.length,
                'hasHeightmap:',
                !!state.terrainSettings.heightmap
              )
            }

            const remainingSurfaces = state.surfaces.filter(s => s.id !== id)
            const hasGroundRemaining = remainingSurfaces.some(s =>
              GROUND_SURFACE_TYPES.includes(s.type)
            )

            // Clear selection if removed surface was selected
            const wasSelected = state.selectedId === id
            const wasInMultiSelect = state.multiSelectedIds.includes(id)

            return {
              surfaces: remainingSurfaces,
              selectedId: wasSelected ? null : state.selectedId,
              multiSelectedIds: wasInMultiSelect
                ? state.multiSelectedIds.filter(sid => sid !== id)
                : state.multiSelectedIds,
              terrainSettings: {
                ...state.terrainSettings,
                heightmap: newHeightmap,
                showWaterPlane: hasGroundRemaining ? state.terrainSettings.showWaterPlane : false,
              },
              hasUnsavedChanges: true,
            }
          }),

        addObject: obj =>
          set(state => ({
            objects: [...state.objects, { ...obj, id: uuidv4(), level: state.activeLevel }],
            hasUnsavedChanges: true,
          })),

        updateObject: (id, updates) =>
          set(state => ({
            objects: state.objects.map(o => (o.id === id ? { ...o, ...updates } : o)),
            hasUnsavedChanges: true,
          })),
        removeObject: id =>
          set(state => {
            // Clear selection if removed object was selected
            const wasSelected = state.selectedId === id
            const wasInMultiSelect = state.multiSelectedIds.includes(id)

            return {
              objects: state.objects.filter(o => o.id !== id),
              selectedId: wasSelected ? null : state.selectedId,
              multiSelectedIds: wasInMultiSelect
                ? state.multiSelectedIds.filter(sid => sid !== id)
                : state.multiSelectedIds,
              hasUnsavedChanges: true,
            }
          }),

        setSelected: id => set({ selectedId: id, multiSelectedIds: id ? [id] : [] }),

        toggleMultiSelect: id =>
          set(state => {
            const current = state.multiSelectedIds
            if (current.includes(id)) {
              return { multiSelectedIds: current.filter(existing => existing !== id) }
            } else {
              return { multiSelectedIds: [...current, id] }
            }
          }),

        clearMultiSelect: () => set({ multiSelectedIds: [] }),

        // Group Actions
        createGroup: (name: string, objectIds: string[]) => {
          const groupId = uuidv4()
          set(state => ({
            groups: [...state.groups, { id: groupId, name }],
            objects: state.objects.map(o => (objectIds.includes(o.id) ? { ...o, groupId } : o)),
            hasUnsavedChanges: true,
          }))
          return groupId
        },

        addToGroup: (groupId: string, objectId: string) =>
          set(state => ({
            objects: state.objects.map(o => (o.id === objectId ? { ...o, groupId } : o)),
            hasUnsavedChanges: true,
          })),

        removeFromGroup: (objectId: string) =>
          set(state => ({
            objects: state.objects.map(o => (o.id === objectId ? { ...o, groupId: undefined } : o)),
            hasUnsavedChanges: true,
          })),

        deleteGroup: (groupId: string) =>
          set(state => ({
            groups: state.groups.filter(g => g.id !== groupId),
            objects: state.objects.map(o =>
              o.groupId === groupId ? { ...o, groupId: undefined } : o
            ),
            hasUnsavedChanges: true,
          })),

        selectGroup: (groupId: string) =>
          set(state => {
            const groupObjectIds = state.objects.filter(o => o.groupId === groupId).map(o => o.id)
            return {
              multiSelectedIds: groupObjectIds,
              selectedId: groupObjectIds[0] || null,
            }
          }),

        combineWalls: options =>
          set(state => {
            const { multiSelectedIds, walls } = state
            if (multiSelectedIds.length < 2) return {}

            const selectedWalls = walls.filter(w => multiSelectedIds.includes(w.id))
            if (selectedWalls.length < 2) return {}

            // CHAINING LOGIC
            // 1. Identify all segments
            // 2. Try to form a continuous path.

            // Helper to check if points are "same"
            const isSame = (p1: [number, number, number], p2: [number, number, number]) =>
              Math.abs(p1[0] - p2[0]) < 0.2 && Math.abs(p1[2] - p2[2]) < 0.2

            // We need to order the walls.
            // Pick a starting wall (one that has an endpoint not shared by 2 others? i.e. an "End")
            // Or just pick first and extend both ways.

            const chain = [selectedWalls[0]]
            const remaining = selectedWalls.slice(1)

            // Try to extend chain at both ends
            let changed = true
            while (changed && remaining.length > 0) {
              changed = false

              // Head of chain
              const head = chain[0]
              const headStart = head.start
              const headEnd = head.end

              // Tail of chain
              const tail = chain[chain.length - 1]
              const tailStart = tail.start
              const tailEnd = tail.end // Actually we need to track orientation of each wall in chain

              // This is getting complex because walls have no inherent direction.
              // Let's simplify: Build a list of points.
            }

            // ROBUST PATH BUILDER:
            // 1. Get all endpoints. Count occurrences.
            //    Points appearing ONCE are starts/ends of the whole strip.
            //    Points appearing TWICE are internal joints.
            //    Points > 2 -> Junction (not supported, just picking one path).

            // Actually, let's just do a greedy neighbor search.
            const segments = selectedWalls.map(w => ({
              id: w.id,
              p1: w.start,
              p2: w.end,
              used: false,
            }))

            // Find a start point (a point that appears only once in the set of all endpoints)
            const pointCounts = new Map<string, number>()
            const coordKey = (p: number[]) => `${p[0].toFixed(2)},${p[2].toFixed(2)}`

            segments.forEach(s => {
              const k1 = coordKey(s.p1)
              pointCounts.set(k1, (pointCounts.get(k1) || 0) + 1)
              const k2 = coordKey(s.p2)
              pointCounts.set(k2, (pointCounts.get(k2) || 0) + 1)
            })

            // Find a Start Segment (has an endpoint with count 1)
            let currentSeg = segments.find(
              s => pointCounts.get(coordKey(s.p1)) === 1 || pointCounts.get(coordKey(s.p2)) === 1
            )
            if (!currentSeg) currentSeg = segments[0] // Loop or complex? Just pick one.

            const orderedPoints: [number, number, number][] = []

            // Determine direction of first segment
            // If p1 is the "dangling" end (count 1), start there.
            let currentPoint =
              pointCounts.get(coordKey(currentSeg.p1)) === 1 ? currentSeg.p1 : currentSeg.p2
            // If loop (all 2s), just pick p1.
            if (!currentSeg) return {} // Should not happen
            if (
              pointCounts.get(coordKey(currentSeg.p1)) !== 1 &&
              pointCounts.get(coordKey(currentSeg.p2)) !== 1
            ) {
              // Loop case
              currentPoint = currentSeg.p1
            }

            orderedPoints.push(currentPoint)

            let count = 0
            while (count < segments.length) {
              // Find the "other" end of current segment
              const otherEnd = isSame(currentSeg.p1, currentPoint) ? currentSeg.p2 : currentSeg.p1
              orderedPoints.push(otherEnd)
              currentSeg.used = true
              count++

              // Find next segment starting at otherEnd
              const nextSeg = segments.find(
                s => !s.used && (isSame(s.p1, otherEnd) || isSame(s.p2, otherEnd))
              )
              if (!nextSeg) break

              currentSeg = nextSeg
              currentPoint = otherEnd // Next iteration will push the NEW other end
            }

            // Basic geometry check: Remove duplicates?
            // The loop pushes `currentPoint` then `otherEnd`.
            // Next iter pushes `otherEnd` (as currentPoint) then `nextOtherEnd`.
            // So we have duplicates: A->B, B->C. Points: A, B, B, C.
            // We should filter them.

            const uniquePoints: [number, number, number][] = []
            if (orderedPoints.length > 0) uniquePoints.push(orderedPoints[0])
            for (let i = 1; i < orderedPoints.length; i++) {
              if (!isSame(orderedPoints[i], orderedPoints[i - 1])) {
                uniquePoints.push(orderedPoints[i])
              }
            }

            if (uniquePoints.length < 2) return {}

            const newSurface: Surface = {
              id: uuidv4(),
              type: 'road', // Default to generic mesh type
              points: uniquePoints,
              isPath: true, // It is a path (extruded)
              curved: true,
              width: selectedWalls[0].thickness || 0.5,
              height: selectedWalls[0].height || 3,
              isVertical: true, // It's a wall!
              roundness: options?.roundness ?? 0.2, // Use option or default
              texture: selectedWalls[0].texture, // Preserve texture from first wall
              layerIndex: 10,
              metalness: 0,
              roughness: 0.8,
            }

            // Remove old walls
            const newWalls = walls.filter(w => !multiSelectedIds.includes(w.id))

            return {
              walls: newWalls,
              surfaces: [...state.surfaces, newSurface],
              multiSelectedIds: [],
              selectedId: newSurface.id,
              hasUnsavedChanges: true,
            }
          }),

        createFloorFromSurface: (id: string) =>
          set(state => {
            const surface = state.surfaces.find(s => s.id === id)
            if (!surface || !surface.points || surface.points.length < 3) {
              return {}
            }

            let floorPoints = surface.points.map(p => [p[0], 0, p[2]] as [number, number, number])

            // If combined/curved, we need to generate the curve points
            // This logic mirrors RoadMesh.tsx
            if (surface.curved && surface.points.length > 2) {
              try {
                const points = surface.points.map(p => new THREE.Vector3(p[0], 0, p[2]))

                // Check for closed loop
                const first = points[0]
                const last = points[points.length - 1]
                const isClosed = first.distanceTo(last) < 0.2

                // CatmullRom expects unique control points for closed loops
                const curvePoints = isClosed ? points.slice(0, -1) : points

                const tension = surface.roundness ?? 0.5
                const curve = new THREE.CatmullRomCurve3(
                  curvePoints,
                  isClosed,
                  'catmullrom',
                  tension
                )

                // Sample points based on length to ensure consistent density
                const length = curve.getLength()
                const steps = Math.max(20, Math.ceil(length * 5)) // 5 points per meter
                const spacedPoints = curve.getSpacedPoints(steps)

                floorPoints = spacedPoints.map(p => [p.x, 0, p.z])
              } catch (e) {
                console.error('Failed to generate curved floor geometry', e)
                // Fallback to original points
              }
            }

            const floorId = uuidv4()
            const newFloor: Floor = {
              id: floorId,
              points: floorPoints,
              y: 0, // Base height
              // texture: undefined
            }

            return {
              floors: [...state.floors, newFloor],
              selectedId: floorId, // Select the new floor
              mode: 'SELECT',
              hasUnsavedChanges: true,
            }
          }),

        saveDesign: async (projectId: string, name?: string) => {
          const state = get()
          set({ isSaving: true })

          const sceneData = {
            walls: state.walls,
            floors: state.floors,
            water: state.water,
            surfaces: state.surfaces,
            objects: state.objects,
            activeLevel: state.activeLevel,
            terrainSettings: {
              baseGroundHeight: state.terrainSettings.baseGroundHeight,
              waterSurfaceHeight: state.terrainSettings.waterSurfaceHeight,
              showWaterPlane: state.terrainSettings.showWaterPlane,
              gridResolution: state.terrainSettings.gridResolution,
              heightmapSize: state.terrainSettings.heightmapSize,
              heightmap: state.terrainSettings.heightmap
                ? Array.from(state.terrainSettings.heightmap)
                : null,
              heightmapVersion: state.terrainSettings.heightmapVersion,
              materialMap: state.terrainSettings.materialMap
                ? Array.from(state.terrainSettings.materialMap)
                : null,
            },
          }

          try {
            if (state.currentDesignId) {
              // Update existing
              const res = await fetch('/api/interior-designer/designs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: state.currentDesignId,
                  name: name || state.currentDesignName,
                  sceneData,
                }),
              })
              const updated = await res.json()
              set({
                currentDesignName: updated.name,
                lastSaved: new Date(),
                hasUnsavedChanges: false,
                isSaving: false,
              })
            } else {
              // Create new
              const res = await fetch('/api/interior-designer/designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  name: name || 'Untitled Design',
                  sceneData,
                }),
              })
              const newDesign = await res.json()
              set({
                currentDesignId: newDesign.id,
                currentDesignName: newDesign.name,
                lastSaved: new Date(),
                hasUnsavedChanges: false,
                isSaving: false,
              })
            }
          } catch (error) {
            console.error('Failed to save design:', error)
            set({ isSaving: false })
          }
        },

        loadDesign: async (designId: string) => {
          try {
            const res = await fetch(`/api/interior-designer/designs?designId=${designId}`)
            const design = await res.json()

            if (design && design.sceneData) {
              const savedTerrain = design.sceneData.terrainSettings
              set({
                currentDesignId: design.id,
                currentDesignName: design.name,
                walls: design.sceneData.walls || [],
                floors: design.sceneData.floors || [],
                water: design.sceneData.water || [],
                surfaces: design.sceneData.surfaces || [],
                objects: design.sceneData.objects || [],
                activeLevel: design.sceneData.activeLevel || 0,
                terrainSettings: savedTerrain
                  ? {
                      baseGroundHeight: savedTerrain.baseGroundHeight ?? 0,
                      waterSurfaceHeight: savedTerrain.waterSurfaceHeight ?? -3,
                      showWaterPlane: savedTerrain.showWaterPlane ?? true,
                      gridResolution: savedTerrain.gridResolution ?? 'medium',
                      quality: savedTerrain.quality ?? 'medium',
                      groundColor: savedTerrain.groundColor ?? '#4a7c59',
                      waterColor: savedTerrain.waterColor ?? '#06b6d4',
                      waterOpacity: savedTerrain.waterOpacity ?? 0.4,
                      sunAngle: savedTerrain.sunAngle ?? 45,
                      heightmapSize: savedTerrain.heightmapSize ?? 64,
                      heightmap: savedTerrain.heightmap
                        ? new Float32Array(savedTerrain.heightmap)
                        : null,
                      heightmapVersion: savedTerrain.heightmapVersion ?? 0,
                      materialMap: savedTerrain.materialMap
                        ? new Uint8Array(savedTerrain.materialMap)
                        : null,
                    }
                  : createDefaultTerrainSettings(),

                lastSaved: new Date(design.updatedAt),
                hasUnsavedChanges: false,
              })
            }
          } catch (error) {
            console.error('Failed to load design:', error)
          }
        },

        renameDesign: async (designId: string, newName: string) => {
          const supabase = (
            await import('@/infrastructure/storage/supabaseClient')
          ).getSupabaseClient()
          const { error } = await supabase
            .from('interior_designs')
            .update({ name: newName })
            .eq('id', designId)

          if (error) {
            console.error('Failed to rename design:', error)
            throw error
          }

          // If we are currently editing this design, update local name
          if (get().currentDesignId === designId) {
            set({ currentDesignName: newName })
          }
        },

        deleteDesign: async (designId: string) => {
          try {
            await fetch(`/api/interior-designer/designs?id=${designId}`, {
              method: 'DELETE',
            })

            // If we deleted the current design, reset to new
            if (get().currentDesignId === designId) {
              get().newDesign()
            }
          } catch (error) {
            console.error('Failed to delete design:', error)
          }
        },

        newDesign: () =>
          set({
            currentDesignId: null,
            currentDesignName: null,
            walls: [],
            floors: [],
            water: [],
            surfaces: [],
            objects: [],
            activeLevel: 0,
            selectedId: null,
            lastSaved: null,
            hasUnsavedChanges: false,
            terrainSettings: createDefaultTerrainSettings(),
            terrainBrush: createDefaultTerrainBrush(),
            terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
            terrainBrushPosition: null,
          }),
      }),
      {
        // Only track changes to these fields
        partialize: state => ({
          walls: state.walls,
          floors: state.floors,
          water: state.water,
          surfaces: state.surfaces,
          objects: state.objects,
          terrainSettings: state.terrainSettings,
          terrainBrush: state.terrainBrush,
        }),
        limit: 50, // Limit history size
      }
    ),
    {
      name: 'interior-designer-storage',
      partialize: state => ({
        // Persist Design Info
        currentDesignId: state.currentDesignId,
        currentDesignName: state.currentDesignName,
      }),
    }
  )
)

// =============================================================================
// OPTIMIZED SELECTOR HOOKS
// Use these instead of subscribing to entire state for better performance
// =============================================================================

/**
 * Subscribe only to terrain settings (heightmap, colors, sizes)
 */
export const useTerrainSettings = () => useInteriorStore(useShallow(state => state.terrainSettings))

/**
 * Subscribe only to heightmap data (for mesh displacement)
 */
export const useHeightmapData = () =>
  useInteriorStore(
    useShallow(state => ({
      heightmap: state.terrainSettings.heightmap,
      heightmapSize: state.terrainSettings.heightmapSize,
      baseGroundHeight: state.terrainSettings.baseGroundHeight,
    }))
  )

/**
 * Subscribe only to terrain brush settings
 */
export const useTerrainBrush = () => useInteriorStore(useShallow(state => state.terrainBrush))

/**
 * Subscribe only to surfaces array
 */
export const useSurfaces = () => useInteriorStore(useShallow(state => state.surfaces))

/**
 * Subscribe only to objects array
 */
export const useObjects = () => useInteriorStore(useShallow(state => state.objects))

/**
 * Subscribe only to selection state
 */
export const useSelection = () =>
  useInteriorStore(
    useShallow(state => ({
      selectedId: state.selectedId,
      multiSelectedIds: state.multiSelectedIds,
    }))
  )

/**
 * Subscribe only to interaction mode
 */
export const useInteractionMode = () => useInteriorStore(state => state.mode)
