import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import * as THREE from 'three'
import { vec3, vec3XZ } from '@/domains/interior-designer/core/vec3'
import type { Floor, Surface } from '../../core/interior-types'
import type { InteriorState } from '../interior-state'
import {
  GROUND_SURFACE_TYPES,
  TERRAIN_WORLD_SIZE,
  isPointInPolygon,
} from '../interior-store-constants'
import { INTERACTION_MODE_SELECT } from '../../constants/interaction-modes'
import {
  SCENE_CURVE_TYPE_CATMULLROM,
  SCENE_CURVED_FLOOR_ERROR,
  SCENE_LOG_BASE_HEIGHT_LABEL,
  SCENE_LOG_CLEARED_PREFIX,
  SCENE_LOG_HAS_HEIGHTMAP,
  SCENE_LOG_HAS_POINTS,
  SCENE_LOG_HEIGHTMAP_CELLS_SUFFIX,
  SCENE_LOG_HEIGHTMAP_SIZE,
  SCENE_LOG_NOT_CLEARING_PREFIX,
  SCENE_LOG_POINTS_LABEL,
  SCENE_LOG_POLYGON_BOUNDS,
  SCENE_LOG_REMOVE_SURFACE_PREFIX,
  SCENE_LOG_TERRAIN_WORLD_SIZE,
  SCENE_LOG_TYPE_LABEL,
  SCENE_SURFACE_TYPE_ROAD,
} from '../../constants/scene-slice-log'

export type SceneSlice = Pick<
  InteriorState,
  | 'walls'
  | 'floors'
  | 'water'
  | 'surfaces'
  | 'objects'
  | 'groups'
  | 'selectedId'
  | 'multiSelectedIds'
  | 'addWall'
  | 'updateWall'
  | 'removeWall'
  | 'addFloor'
  | 'updateFloor'
  | 'removeFloor'
  | 'addWater'
  | 'updateWater'
  | 'removeWater'
  | 'addSurface'
  | 'updateSurface'
  | 'removeSurface'
  | 'addObject'
  | 'updateObject'
  | 'removeObject'
  | 'setSelected'
  | 'toggleMultiSelect'
  | 'clearMultiSelect'
  | 'combineWalls'
  | 'createFloorFromSurface'
  | 'createGroup'
  | 'addToGroup'
  | 'removeFromGroup'
  | 'deleteGroup'
  | 'selectGroup'
>

export const createSceneSlice: StateCreator<InteriorState, [], [], SceneSlice> = set => ({
  walls: [],
  floors: [],
  water: [],
  surfaces: [],
  objects: [],
  groups: [],
  selectedId: null,
  multiSelectedIds: [],

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
      const surface = state.surfaces.find(s => s.id === id)

      console.log(
        SCENE_LOG_REMOVE_SURFACE_PREFIX,
        id,
        SCENE_LOG_TYPE_LABEL,
        surface?.type,
        SCENE_LOG_POINTS_LABEL,
        surface?.points?.length
      )

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
        const polygon: Array<[number, number]> = surface.points.map(p => [p[0], p[2]])

        const minX = Math.min(...polygon.map(p => p[0]))
        const maxX = Math.max(...polygon.map(p => p[0]))
        const minZ = Math.min(...polygon.map(p => p[1]))
        const maxZ = Math.max(...polygon.map(p => p[1]))
        console.log(SCENE_LOG_POLYGON_BOUNDS, { minX, maxX, minZ, maxZ })
        console.log(SCENE_LOG_HEIGHTMAP_SIZE, heightmapSize, SCENE_LOG_BASE_HEIGHT_LABEL, baseHeight)
        console.log(SCENE_LOG_TERRAIN_WORLD_SIZE, TERRAIN_WORLD_SIZE)

        newHeightmap = new Float32Array(heightmap)

        let clearedCount = 0

        for (let gridZ = 0; gridZ < heightmapSize; gridZ++) {
          for (let gridX = 0; gridX < heightmapSize; gridX++) {
            const worldX = (gridX / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2
            const worldZ = (gridZ / heightmapSize) * TERRAIN_WORLD_SIZE - TERRAIN_WORLD_SIZE / 2

            if (isPointInPolygon(worldX, worldZ, polygon)) {
              newHeightmap[gridZ * heightmapSize + gridX] = baseHeight
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
      } else {
        console.log(
          SCENE_LOG_NOT_CLEARING_PREFIX,
          surface ? GROUND_SURFACE_TYPES.includes(surface.type) : false,
          SCENE_LOG_HAS_POINTS,
          surface?.points?.length,
          SCENE_LOG_HAS_HEIGHTMAP,
          !!state.terrainSettings.heightmap
        )
      }

      const remainingSurfaces = state.surfaces.filter(s => s.id !== id)
      const hasGroundRemaining = remainingSurfaces.some(s => GROUND_SURFACE_TYPES.includes(s.type))

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

  addObject: obj => {
    const normalizedObj = { ...obj }
    return set(state => ({
      objects: [...state.objects, { ...normalizedObj, id: uuidv4(), level: state.activeLevel }],
      hasUnsavedChanges: true,
    }))
  },

  updateObject: (id, updates) =>
    set(state => {
      const normalizedUpdates = { ...updates }
      return {
        objects: state.objects.map(o => (o.id === id ? { ...o, ...normalizedUpdates } : o)),
        hasUnsavedChanges: true,
      }
    }),
  removeObject: id =>
    set(state => {
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
      }
      return { multiSelectedIds: [...current, id] }
    }),

  clearMultiSelect: () => set({ multiSelectedIds: [] }),

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
      objects: state.objects.map(o => (o.groupId === groupId ? { ...o, groupId: undefined } : o)),
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

      const isSame = (p1: [number, number, number], p2: [number, number, number]) =>
        Math.abs(p1[0] - p2[0]) < 0.2 && Math.abs(p1[2] - p2[2]) < 0.2

      const segments = selectedWalls.map(w => ({
        id: w.id,
        p1: w.start,
        p2: w.end,
        used: false,
      }))

      const pointCounts = new Map<string, number>()
      const coordKey = (p: number[]) => `${p[0].toFixed(2)},${p[2].toFixed(2)}`

      segments.forEach(s => {
        const k1 = coordKey(s.p1)
        pointCounts.set(k1, (pointCounts.get(k1) || 0) + 1)
        const k2 = coordKey(s.p2)
        pointCounts.set(k2, (pointCounts.get(k2) || 0) + 1)
      })

      const startSeg =
        segments.find(
          s => pointCounts.get(coordKey(s.p1)) === 1 || pointCounts.get(coordKey(s.p2)) === 1
        ) ?? segments[0]
      if (!startSeg) return {}
      let currentSeg = startSeg

      const orderedPoints: [number, number, number][] = []

      let currentPoint =
        pointCounts.get(coordKey(currentSeg.p1)) === 1 ? currentSeg.p1 : currentSeg.p2
      if (
        pointCounts.get(coordKey(currentSeg.p1)) !== 1 &&
        pointCounts.get(coordKey(currentSeg.p2)) !== 1
      ) {
        currentPoint = currentSeg.p1
      }

      orderedPoints.push(currentPoint)

      let count = 0
      while (count < segments.length) {
        const otherEnd = isSame(currentSeg.p1, currentPoint) ? currentSeg.p2 : currentSeg.p1
        orderedPoints.push(otherEnd)
        currentSeg.used = true
        count++

        const nextSeg = segments.find(
          s => !s.used && (isSame(s.p1, otherEnd) || isSame(s.p2, otherEnd))
        )
        if (!nextSeg) break

        currentSeg = nextSeg
        currentPoint = otherEnd
      }

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
        type: SCENE_SURFACE_TYPE_ROAD,
        points: uniquePoints,
        isPath: true,
        curved: true,
        width: selectedWalls[0].thickness || 0.5,
        height: selectedWalls[0].height || 3,
        isVertical: true,
        roundness: options?.roundness ?? 0.2,
        texture: selectedWalls[0].texture,
        layerIndex: 10,
        metalness: 0,
        roughness: 0.8,
      }

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

      let floorPoints = surface.points.map(p => vec3XZ(p[0], p[2]))

      if (surface.curved && surface.points.length > 2) {
        try {
          const points = surface.points.map(p => new THREE.Vector3(p[0], 0, p[2]))

          const first = points[0]
          const last = points[points.length - 1]
          const isClosed = first.distanceTo(last) < 0.2

          const curvePoints = isClosed ? points.slice(0, -1) : points

          const tension = surface.roundness ?? 0.5
          const curve = new THREE.CatmullRomCurve3(curvePoints, isClosed, SCENE_CURVE_TYPE_CATMULLROM, tension)

          const length = curve.getLength()
          const steps = Math.max(20, Math.ceil(length * 5))
          const spacedPoints = curve.getSpacedPoints(steps)

          floorPoints = spacedPoints.map(p => vec3(p.x, 0, p.z))
        } catch (e) {
          console.error(SCENE_CURVED_FLOOR_ERROR, e)
        }
      }

      const floorId = uuidv4()
      const newFloor: Floor = {
        id: floorId,
        points: floorPoints,
        y: 0,
      }

      return {
        floors: [...state.floors, newFloor],
        selectedId: floorId,
        mode: INTERACTION_MODE_SELECT,
        hasUnsavedChanges: true,
      }
    }),
})
