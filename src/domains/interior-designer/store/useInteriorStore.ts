import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'

export type InteractionMode = 'SELECT' | 'WALL' | 'FLOOR' | 'WATER' | 'OBJECT' | 'SCATTER' | 'SURFACE'

export type SurfaceType = 'grass' | 'water' | 'road' | 'dirt' | 'pavement' | 'mars' | 'sand' | 'rock'

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
}

export interface Wall {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  height: number
  thickness: number
  texture?: string
}

export interface Floor {
  id: string
  points: [number, number, number][] // Polygon vertices
  y: number
  texture?: string
}

export interface Water {
  id: string
  points: [number, number, number][] // Polygon vertices
  y: number
}

export interface SceneObject {
  id: string
  modelUrl: string // or primitive type like 'cube', 'sphere', or 'asset:id'
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  isLoading?: boolean // True while GLB is being fetched
  thumbnailUrl?: string // Preview image for loading state
}

interface InteriorState {
  mode: InteractionMode
  walls: Wall[]
  // Legacy support (to be migrated/removed)
  floors: Floor[]
  water: Water[]

  // New Unified System
  surfaces: Surface[]

  objects: SceneObject[]
  selectedId: string | null
  multiSelectedIds: string[]
  activeLevel: number
  activeModelUrl: string
  // Surface Tool State
  activeSurfaceType: SurfaceType
  isCurved: boolean

  exportRequested: boolean
  cameraResetRequested: boolean

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
  approveRetexture: (elementId: string) => void
  cancelRetexture: (elementId: string) => void

  // Actions
  setMode: (mode: InteractionMode) => void
  setActiveLevel: (level: number) => void
  setActiveModelUrl: (url: string) => void
  setActiveSurfaceType: (type: SurfaceType) => void
  setIsCurved: (curved: boolean) => void
  setExportRequested: (requested: boolean) => void
  setCameraResetRequested: (requested: boolean) => void
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

  // Persistence actions

  // Persistence actions
  saveDesign: (projectId: string, name?: string) => Promise<void>
  loadDesign: (designId: string) => Promise<void>
  deleteDesign: (designId: string) => Promise<void>
  newDesign: () => void
  markUnsaved: () => void
}

import { temporal } from 'zundo'

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
        selectedId: null,
        multiSelectedIds: [],
        activeLevel: 0,
        activeModelUrl: 'cube',
        activeSurfaceType: 'road',
        isCurved: true,
        exportRequested: false,
        cameraResetRequested: false,

        // Retexture Actions (integrated with GlobalStatusStore)
        approveRetexture: (elementId: string) => set(state => {
          const { objects, walls } = state

          // Find the operation in GlobalStatusStore to get the result URL
          const operation = useGlobalStatusStore.getState().operations.find(
            op => op.id === `retexture-${elementId}`
          )

          if (!operation || operation.status !== 'completed') return {}

          // Extract URL from operation details (stored as JSON)
          let pendingRetextureUrl: string | null = null
          try {
            const metadata = JSON.parse(operation.details || '{}')
            pendingRetextureUrl = metadata.retexturedUrl
          } catch (e) {
            console.error('Failed to parse operation metadata', e)
            return {}
          }

          if (!pendingRetextureUrl) return {}

          // Check if it's an object
          const objectExists = objects.some(o => o.id === elementId)
          if (objectExists) {
            const updatedObjects = objects.map(obj => {
              if (obj.id === elementId) {
                return { ...obj, modelUrl: pendingRetextureUrl, isLoading: false }
              }
              return obj
            })

            // Remove the operation from GlobalStatusStore
            useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)

            return {
              objects: updatedObjects,
              hasUnsavedChanges: true
            }
          }

          // Check if it's a wall
          const wall = walls.find(w => w.id === elementId)
          if (wall) {
            const midX = (wall.start[0] + wall.end[0]) / 2
            const midZ = (wall.start[2] + wall.end[2]) / 2

            const newObject: SceneObject = {
              id: wall.id,
              modelUrl: pendingRetextureUrl,
              position: [midX, wall.start[1], midZ],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              isLoading: false
            }

            // Remove the operation from GlobalStatusStore
            useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)

            return {
              walls: walls.filter(w => w.id !== elementId),
              objects: [...objects, newObject],
              hasUnsavedChanges: true
            }
          }

          return {}
        }),

        cancelRetexture: (elementId: string) => {
          // Remove the operation from GlobalStatusStore
          useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
        },

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

        setMode: mode => set({ mode }),
        setActiveLevel: level => set({ activeLevel: level }),
        setActiveModelUrl: url => set({ activeModelUrl: url }),
        setActiveSurfaceType: type => set({ activeSurfaceType: type }),
        setIsCurved: curved => set({ isCurved: curved }),
        setExportRequested: requested => set({ exportRequested: requested }),
        setCameraResetRequested: requested => set({ cameraResetRequested: requested }),

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
            walls: [...state.walls, { ...wall, id: uuidv4() }],
            hasUnsavedChanges: true,
          })),
        updateWall: (id, updates) =>
          set(state => ({
            walls: state.walls.map(w => (w.id === id ? { ...w, ...updates } : w)),
            hasUnsavedChanges: true,
          })),
        removeWall: id =>
          set(state => ({
            walls: state.walls.filter(w => w.id !== id),
            hasUnsavedChanges: true,
          })),

        addFloor: floor =>
          set(state => ({
            floors: [...state.floors, { ...floor, id: uuidv4() }],
            hasUnsavedChanges: true,
          })),
        updateFloor: (id, updates) =>
          set(state => ({
            floors: state.floors.map(f => (f.id === id ? { ...f, ...updates } : f)),
            hasUnsavedChanges: true,
          })),
        removeFloor: id =>
          set(state => ({
            floors: state.floors.filter(f => f.id !== id),
            hasUnsavedChanges: true,
          })),

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
            surfaces: [...state.surfaces, { ...surface, id: uuidv4() }].sort((a, b) => a.layerIndex - b.layerIndex),
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
          set(state => ({
            surfaces: state.surfaces.filter(s => s.id !== id),
            hasUnsavedChanges: true,
          })),

        addObject: obj =>
          set(state => ({
            objects: [...state.objects, { ...obj, id: uuidv4() }],
            hasUnsavedChanges: true,
          })),
        updateObject: (id, updates) =>
          set(state => ({
            objects: state.objects.map(o => (o.id === id ? { ...o, ...updates } : o)),
            hasUnsavedChanges: true,
          })),
        removeObject: id =>
          set(state => ({
            objects: state.objects.filter(o => o.id !== id),
            hasUnsavedChanges: true,
          })),

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

        combineWalls: (options) =>
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

            let chain = [selectedWalls[0]]
            let remaining = selectedWalls.slice(1)

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
              used: false
            }))

            // Find a start point (a point that appears only once in the set of all endpoints)
            const pointCounts = new Map<string, number>()
            const coordKey = (p: number[]) => `${p[0].toFixed(2)},${p[2].toFixed(2)}`

            segments.forEach(s => {
              const k1 = coordKey(s.p1); pointCounts.set(k1, (pointCounts.get(k1) || 0) + 1)
              const k2 = coordKey(s.p2); pointCounts.set(k2, (pointCounts.get(k2) || 0) + 1)
            })

            // Find a Start Segment (has an endpoint with count 1)
            let currentSeg = segments.find(s => pointCounts.get(coordKey(s.p1)) === 1 || pointCounts.get(coordKey(s.p2)) === 1)
            if (!currentSeg) currentSeg = segments[0] // Loop or complex? Just pick one.

            const orderedPoints: [number, number, number][] = []

            // Determine direction of first segment
            // If p1 is the "dangling" end (count 1), start there.
            let currentPoint = (pointCounts.get(coordKey(currentSeg.p1)) === 1) ? currentSeg.p1 : currentSeg.p2
            // If loop (all 2s), just pick p1.
            if (!currentSeg) return {} // Should not happen
            if (pointCounts.get(coordKey(currentSeg.p1)) !== 1 && pointCounts.get(coordKey(currentSeg.p2)) !== 1) {
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
              const nextSeg = segments.find(s => !s.used && (isSame(s.p1, otherEnd) || isSame(s.p2, otherEnd)))
              if (!nextSeg) break;

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
              roughness: 0.8
            }

            // Remove old walls
            const newWalls = walls.filter(w => !multiSelectedIds.includes(w.id))

            return {
              walls: newWalls,
              surfaces: [...state.surfaces, newSurface],
              multiSelectedIds: [],
              selectedId: newSurface.id,
              hasUnsavedChanges: true
            }
          }),

        createFloorFromSurface: (id: string) =>
          set(state => {
            const surface = state.surfaces.find(s => s.id === id)
            if (!surface || !surface.points || surface.points.length < 3) {
              return {}
            }

            const floorId = uuidv4()
            const newFloor: Floor = {
              id: floorId,
              points: surface.points.map(p => [p[0], 0, p[2]]), // Map 3D points
              y: 0, // Base height
              // texture: undefined
            }

            return {
              floors: [...state.floors, newFloor],
              selectedId: floorId, // Select the new floor
              mode: 'SELECT',
              hasUnsavedChanges: true
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
              set({
                currentDesignId: design.id,
                currentDesignName: design.name,
                walls: design.sceneData.walls || [],
                floors: design.sceneData.floors || [],
                water: design.sceneData.water || [],
                surfaces: design.sceneData.surfaces || [],
                objects: design.sceneData.objects || [],
                activeLevel: design.sceneData.activeLevel || 0,
                lastSaved: new Date(design.updatedAt),
                hasUnsavedChanges: false,
              })
            }
          } catch (error) {
            console.error('Failed to load design:', error)
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
        }),
        limit: 50, // Limit history size
      }
    ),
    {
      name: 'interior-designer-storage',
      partialize: (state) => ({
        // Persist Design Info
        currentDesignId: state.currentDesignId,
        currentDesignName: state.currentDesignName,
      })
    }
  )
)
