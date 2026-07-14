import type { StateCreator } from 'zustand'
import { surfaceFromJson, wallFromJson } from '@/domains/interior-designer/core/scene-element-guards'
import {
  RETEXTURE_EMPTY_METADATA,
  RetextureOriginalType,
  RetextureSliceLog,
} from '@/domains/interior-designer/constants/retexture-slice-log'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import type { InteriorState } from '../interior-state'
import type { SceneObject } from '../../core/interior-types'

export type RetextureSlice = Pick<
  InteriorState,
  | 'requestRetextureExport'
  | 'retextureModelBase64'
  | 'setRequestRetextureExport'
  | 'setRetextureModelBase64'
  | 'previewRetexture'
  | 'revertRetexture'
  | 'approveRetexture'
  | 'cancelRetexture'
>

export const createRetextureSlice: StateCreator<InteriorState, [], [], RetextureSlice> = (
  set,
  get
) => ({
  requestRetextureExport: false,
  retextureModelBase64: null,
  setRequestRetextureExport: requested => set({ requestRetextureExport: requested }),
  setRetextureModelBase64: base64 => set({ retextureModelBase64: base64 }),

  previewRetexture: (elementId: string, retexturedUrl: string) =>
    set(state => {
      const { objects, walls, surfaces } = state

      const object = objects.find(o => o.id === elementId)
      if (object) {
        return {
          objects: objects.map(o => (o.id === elementId ? { ...o, modelUrl: retexturedUrl } : o)),
          hasUnsavedChanges: true,
        }
      }

      const wall = walls.find(w => w.id === elementId)
      if (wall) {
        const midX = (wall.start[0] + wall.end[0]) / 2
        const midZ = (wall.start[2] + wall.end[2]) / 2
        const rotationY = Math.atan2(wall.end[0] - wall.start[0], wall.end[2] - wall.start[2])

        const dx = wall.end[0] - wall.start[0]
        const dz = wall.end[2] - wall.start[2]
        const length = Math.sqrt(dx * dx + dz * dz)
        const thickness = wall.thickness || 0.2

        const newObject: SceneObject = {
          id: wall.id,
          modelUrl: retexturedUrl,
          position: [midX, wall.start[1], midZ],
          rotation: [0, rotationY, 0],
          scale: [1, 1, 1],
          targetDimensions: [thickness, wall.height, length],
          isLoading: false,
        }

        return {
          walls: walls.filter(w => w.id !== elementId),
          objects: [...objects, newObject],
          hasUnsavedChanges: true,
        }
      }

      const surface = surfaces.find(s => s.id === elementId)
      if (surface) {
        const operation = useGlobalStatusStore
          .getState()
          .operations.find(op => op.id === `retexture-${elementId}`)
        let centerX: number,
          centerZ: number,
          width: number,
          depth: number

        try {
          const metadata = JSON.parse(operation?.details || RETEXTURE_EMPTY_METADATA)
          const bbox = metadata.originalBoundingBox

          if (bbox && bbox.center) {
            centerX = bbox.center[0]
            centerZ = bbox.center[2]
            width = bbox.size[0]
            depth = bbox.size[2]
            console.log(RetextureSliceLog.UsingBoundingBox, {
              center: bbox.center,
              size: bbox.size,
              min: bbox.min,
              max: bbox.max,
              calculatedPosition: [centerX, bbox.min ? bbox.min[1] : 0, centerZ],
            })
          } else {
            throw new Error(RetextureSliceLog.FallbackSurfacePoints)
          }
        } catch {
          console.log(RetextureSliceLog.FallingBackToSurfacePoints)
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
        const previewId = `preview-${surface.id}`
        const filteredObjects = objects.filter(o => o.id !== previewId)

        const newObject: SceneObject = {
          id: previewId,
          modelUrl: retexturedUrl,
          position: [centerX, 0, centerZ],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          targetDimensions: [width || 1, height, depth || 1],
          isLoading: true,
        }

        console.log(RetextureSliceLog.CreatingPreviewObject, newObject)

        return {
          objects: [...filteredObjects, newObject],
          hasUnsavedChanges: true,
        }
      }

      return {}
    }),

  revertRetexture: (elementId: string) =>
    set(state => {
      const operation = useGlobalStatusStore
        .getState()
        .operations.find(op => op.id === `retexture-${elementId}`)
      if (!operation) return {}

      try {
        const metadata = JSON.parse(operation.details || RETEXTURE_EMPTY_METADATA)

        if (metadata.originalType === RetextureOriginalType.Wall && metadata.originalData) {
          const wallData = wallFromJson(metadata.originalData)
          if (!wallData) return {}
          const newObjects = state.objects.filter(o => o.id !== elementId)
          return {
            objects: newObjects,
            walls: [...state.walls, wallData],
            hasUnsavedChanges: true,
          }
        }

        if (metadata.originalType === RetextureOriginalType.Surface && metadata.originalData) {
          const surfaceData = surfaceFromJson(metadata.originalData)
          if (!surfaceData) return {}
          const newObjects = state.objects.filter(o => o.id !== elementId)
          return {
            objects: newObjects,
            surfaces: [...state.surfaces, surfaceData],
            hasUnsavedChanges: true,
          }
        }

        if (metadata.originalModelUrl) {
          return {
            objects: state.objects.map(o =>
              o.id === elementId ? { ...o, modelUrl: metadata.originalModelUrl } : o
            ),
            hasUnsavedChanges: true,
          }
        }
      } catch (e) {
        console.error(RetextureSliceLog.RevertFailed, e)
      }
      return {}
    }),

  approveRetexture: (elementId: string) =>
    set(state => {
      const previewId = `preview-${elementId}`
      const previewObject = state.objects.find(o => o.id === previewId)

      if (previewObject) {
        useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
        return {
          surfaces: state.surfaces.filter(s => s.id !== elementId),
          objects: state.objects.map(o => (o.id === previewId ? { ...o, id: elementId } : o)),
          hasUnsavedChanges: true,
        }
      }

      useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
      return {}
    }),

  cancelRetexture: (elementId: string) =>
    set(state => {
      const previewId = `preview-${elementId}`
      const hasPreview = state.objects.some(o => o.id === previewId)

      if (hasPreview) {
        useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
        return {
          objects: state.objects.filter(o => o.id !== previewId),
          hasUnsavedChanges: true,
        }
      }

      get().revertRetexture(elementId)
      useGlobalStatusStore.getState().removeOperation(`retexture-${elementId}`)
      return {}
    }),
})
