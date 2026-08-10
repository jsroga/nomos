import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'
import {
  INTERIOR_DESIGNER_STORAGE_KEY,
  InteriorPersistKey,
} from '@/domains/3d-canvas/constants/interior-storage'
import { isRenderQuality } from '@/domains/3d-canvas/core/render-quality'
import { RenderQuality } from '@/domains/3d-canvas/constants/render-quality'
import { isPlainObject } from '@/shared/data/json-guards'
import type { InteriorState } from './interior-state'
import { createPersistenceSlice } from './slices/persistence-slice'
import { createRetextureSlice } from './slices/retexture-slice'
import { createSceneSlice } from './slices/scene-slice'
import { createTerrainSlice } from './slices/terrain-slice'
import { createUiSlice } from './slices/ui-slice'

function mergePersistedInteriorState(
  persisted: unknown,
  current: InteriorState,
): InteriorState {
  const next = { ...current }
  if (!isPlainObject(persisted)) return next

  if (InteriorPersistKey.CurrentDesignId in persisted) {
    const id = persisted[InteriorPersistKey.CurrentDesignId]
    next.currentDesignId = typeof id === 'string' || id === null ? id : current.currentDesignId
  }
  if (InteriorPersistKey.CurrentDesignName in persisted) {
    const name = persisted[InteriorPersistKey.CurrentDesignName]
    next.currentDesignName =
      typeof name === 'string' || name === null ? name : current.currentDesignName
  }
  if (
    InteriorPersistKey.RenderQuality in persisted &&
    typeof persisted[InteriorPersistKey.RenderQuality] === 'string'
  ) {
    const quality = persisted[InteriorPersistKey.RenderQuality]
    next.renderQuality = isRenderQuality(quality) ? quality : RenderQuality.High
  }
  return next
}

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
        // Scene edits only — heightmaps are high-frequency and must not fill undo history.
        partialize: state => ({
          walls: state.walls,
          floors: state.floors,
          water: state.water,
          surfaces: state.surfaces,
          objects: state.objects,
        }),
        limit: 50,
      }
    ),
    {
      name: INTERIOR_DESIGNER_STORAGE_KEY,
      partialize: state => ({
        [InteriorPersistKey.CurrentDesignId]: state.currentDesignId,
        [InteriorPersistKey.CurrentDesignName]: state.currentDesignName,
        [InteriorPersistKey.RenderQuality]: state.renderQuality,
      }),
      merge: (persisted, current) => mergePersistedInteriorState(persisted, current),
    }
  )
)

export type { InteriorState } from './interior-state'
