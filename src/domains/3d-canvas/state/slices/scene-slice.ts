import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Floor } from '../../core/interior-types'
import type { InteriorState } from '../interior-state'
import { GROUND_SURFACE_TYPES } from '../interior-store-constants'
import { INTERACTION_MODE_SELECT } from '../../constants/interaction-modes'
import {
  SCENE_LOG_POINTS_LABEL,
  SCENE_LOG_REMOVE_SURFACE_PREFIX,
  SCENE_LOG_TYPE_LABEL,
} from '../../constants/scene-slice-log'
import {
  buildRoadSurfaceFromWalls,
  partitionWallsBySelection,
} from '../utils/scene-slice-combine-walls'
import { buildCurvedFloorPoints } from '../utils/scene-slice-floor-from-surface'
import { clearHeightmapForRemovedSurface } from '../utils/scene-slice-remove-heightmap'

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

      const newHeightmap = clearHeightmapForRemovedSurface(surface, state.terrainSettings)

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

      const { selectedWalls, remainingWalls } = partitionWallsBySelection(walls, multiSelectedIds)
      const newSurface = buildRoadSurfaceFromWalls(selectedWalls, options?.roundness)
      if (!newSurface) return {}

      return {
        walls: remainingWalls,
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

      const floorPoints = buildCurvedFloorPoints(surface)

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
