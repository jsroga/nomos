import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import { INTERIOR_DESIGNER_STORAGE_KEY } from '@/domains/3d-canvas/constants/interior-storage'
import type { InteriorState } from './interior-state'
import { createPersistenceSlice } from './slices/persistence-slice'
import { createRetextureSlice } from './slices/retexture-slice'
import { createSceneSlice } from './slices/scene-slice'
import { createTerrainSlice } from './slices/terrain-slice'
import { createUiSlice } from './slices/ui-slice'

export const useInteriorStore = create<InteriorState>()(
  persist(
    temporal(
      (...args) => ({
        ...createUiSlice(...args),
        ...createTerrainSlice(...args),
        ...createRetextureSlice(...args),
        ...createSceneSlice(...args),
        ...createPersistenceSlice(...args),
      }),
      {
        partialize: state => ({
          walls: state.walls,
          floors: state.floors,
          water: state.water,
          surfaces: state.surfaces,
          objects: state.objects,
          terrainSettings: state.terrainSettings,
          terrainBrush: state.terrainBrush,
        }),
        limit: 50,
      }
    ),
    {
      name: INTERIOR_DESIGNER_STORAGE_KEY,
      partialize: state => ({
        currentDesignId: state.currentDesignId,
        currentDesignName: state.currentDesignName,
      }),
    }
  )
)

export type { InteriorState } from './interior-state'
