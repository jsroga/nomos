import type { StateCreator } from 'zustand'
import { interiorDesignerApi } from '@/domains/interior-designer/io/interior-designer.api'
import { interiorSceneDataSchema, type InteriorSceneData } from '@/domains/interior-designer/io'
import { vec3 } from '@/domains/interior-designer/core/vec3'
import type { SceneObject } from '../../core/interior-types'
import type { InteriorState } from '../interior-state'
import {
  createDefaultTerrainBrush,
  createDefaultTerrainMaterialPaint,
  createDefaultTerrainSettings,
} from '../interior-store-constants'
import {
  GridResolutionValue,
  InteriorDesignDefaultTitle,
  InteriorPersistenceLog,
  TerrainColor,
  TerrainQualityValue,
} from '@/domains/interior-designer/constants/terrain-defaults'

export type PersistenceSlice = Pick<
  InteriorState,
  | 'currentDesignId'
  | 'currentDesignName'
  | 'isSaving'
  | 'lastSaved'
  | 'hasUnsavedChanges'
  | 'markUnsaved'
  | 'saveDesign'
  | 'loadDesign'
  | 'renameDesign'
  | 'deleteDesign'
  | 'newDesign'
>

export const createPersistenceSlice: StateCreator<InteriorState, [], [], PersistenceSlice> = (
  set,
  get
) => ({
  currentDesignId: null,
  currentDesignName: null,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,

  markUnsaved: () => set({ hasUnsavedChanges: true }),

  saveDesign: async (projectId: string, name?: string) => {
    const state = get()
    set({ isSaving: true })

    const sceneData: InteriorSceneData = interiorSceneDataSchema.parse({
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
    })

    try {
      if (state.currentDesignId) {
        const updated = await interiorDesignerApi.designs.update({
          id: state.currentDesignId,
          name: name || state.currentDesignName || InteriorDesignDefaultTitle.Untitled,
          sceneData,
        })

        if (!updated) {
          throw new Error(InteriorPersistenceLog.UpdateFailed)
        }

        set({
          currentDesignName: updated.name,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          isSaving: false,
        })
      } else {
        const newDesign = await interiorDesignerApi.designs.create({
          projectId,
          name: name || InteriorDesignDefaultTitle.Untitled,
          sceneData,
        })

        if (!newDesign) {
          throw new Error(InteriorPersistenceLog.CreateFailed)
        }

        set({
          currentDesignId: newDesign.id,
          currentDesignName: newDesign.name,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          isSaving: false,
        })
      }
    } catch (error) {
      console.error(InteriorPersistenceLog.SaveFailed, error)
      set({ isSaving: false })
    }
  },

  loadDesign: async (designId: string) => {
    try {
      const design = await interiorDesignerApi.designs.get({ designId })

      if (design && design.sceneData) {
        const savedTerrain = design.sceneData.terrainSettings
        const normalizedObjects: SceneObject[] = (design.sceneData.objects || []).map(obj => ({
          ...obj,
          position: obj.position
            ? vec3(obj.position[0] ?? 0, 0, obj.position[2] ?? 0)
            : vec3(0, 0, 0),
        }))
        set({
          currentDesignId: design.id,
          currentDesignName: design.name,
          walls: design.sceneData.walls || [],
          floors: design.sceneData.floors || [],
          water: design.sceneData.water || [],
          surfaces: design.sceneData.surfaces || [],
          objects: normalizedObjects,
          activeLevel: design.sceneData.activeLevel || 0,
          terrainSettings: savedTerrain
            ? {
                baseGroundHeight: savedTerrain.baseGroundHeight ?? 0,
                waterSurfaceHeight: savedTerrain.waterSurfaceHeight ?? -3,
                showWaterPlane: savedTerrain.showWaterPlane ?? true,
                gridResolution: savedTerrain.gridResolution ?? GridResolutionValue.Medium,
                quality: savedTerrain.quality ?? TerrainQualityValue.Medium,
                groundColor: savedTerrain.groundColor ?? TerrainColor.Ground,
                waterColor: savedTerrain.waterColor ?? TerrainColor.Water,
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
      console.error(InteriorPersistenceLog.LoadFailed, error)
    }
  },

  renameDesign: async (designId: string, newName: string) => {
    await interiorDesignerApi.designs.update({
      id: designId,
      name: newName,
    })

    if (get().currentDesignId === designId) {
      set({ currentDesignName: newName })
    }
  },

  deleteDesign: async (designId: string) => {
    try {
      await interiorDesignerApi.designs.delete({ id: designId })

      if (get().currentDesignId === designId) {
        get().newDesign()
      }
    } catch (error) {
      console.error(InteriorPersistenceLog.DeleteFailed, error)
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
})
