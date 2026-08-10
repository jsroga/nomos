import type { StateCreator } from 'zustand'
import {
  INTERACTION_MODE_SELECT,
  INTERACTION_MODE_TERRAIN,
  InteriorObjectModel,
  InteriorSurfacePreset,
  TransformMode,
} from '@/domains/3d-canvas/constants/interaction-modes'
import { RenderQuality } from '@/domains/3d-canvas/constants/render-quality'
import type { InteractionMode } from '../../core/interior-types'
import type { InteriorState } from '../interior-state'
import {
  createDefaultTerrainBrush,
  createDefaultTerrainMaterialPaint,
  createDefaultTerrainSettings,
} from '../interior-store-constants'

export type UiSlice = Pick<
  InteriorState,
  | 'mode'
  | 'exportRequested'
  | 'cameraResetRequested'
  | 'zenMode'
  | 'renderQuality'
  | 'interactionActive'
  | 'activeLevel'
  | 'activeModelUrl'
  | 'activeSurfaceType'
  | 'isCurved'
  | 'lockY'
  | 'snapEnabled'
  | 'snapSize'
  | 'transformMode'
  | 'setMode'
  | 'setActiveLevel'
  | 'setActiveModelUrl'
  | 'setActiveSurfaceType'
  | 'setIsCurved'
  | 'setExportRequested'
  | 'setCameraResetRequested'
  | 'setZenMode'
  | 'toggleZenMode'
  | 'setRenderQuality'
  | 'setInteractionActive'
  | 'setLockY'
  | 'setSnapEnabled'
  | 'setSnapSize'
  | 'setTransformMode'
  | 'resetInterior'
>

export const createUiSlice: StateCreator<InteriorState, [], [], UiSlice> = set => ({
  mode: INTERACTION_MODE_SELECT,
  exportRequested: false,
  cameraResetRequested: false,
  zenMode: false,
  renderQuality: RenderQuality.High,
  interactionActive: false,
  activeLevel: 0,
  activeModelUrl: InteriorObjectModel.Cube,
  activeSurfaceType: InteriorSurfacePreset.Road,
  isCurved: true,
  lockY: true,
  snapEnabled: true,
  snapSize: 0.5,
  transformMode: TransformMode.Translate,

  setMode: (mode: InteractionMode) =>
    set(state => ({
      mode,
      terrainBrush:
        state.mode === INTERACTION_MODE_TERRAIN && mode !== INTERACTION_MODE_TERRAIN
          ? { ...state.terrainBrush, position: null }
          : state.terrainBrush,
    })),

  setActiveLevel: level => set({ activeLevel: level, selectedId: null, multiSelectedIds: [] }),
  setActiveModelUrl: url => set({ activeModelUrl: url }),
  setActiveSurfaceType: type => set({ activeSurfaceType: type }),
  setIsCurved: curved => set({ isCurved: curved }),
  setExportRequested: requested => set({ exportRequested: requested }),
  setCameraResetRequested: requested => set({ cameraResetRequested: requested }),
  setZenMode: enabled => set({ zenMode: enabled }),
  toggleZenMode: () => set(state => ({ zenMode: !state.zenMode })),
  setRenderQuality: renderQuality => set({ renderQuality }),
  setInteractionActive: interactionActive => set({ interactionActive }),
  setLockY: lockY => set({ lockY }),
  setSnapEnabled: snapEnabled => set({ snapEnabled }),
  setSnapSize: snapSize => set({ snapSize }),
  setTransformMode: transformMode => set({ transformMode }),

  resetInterior: () =>
    set(state => ({
      mode: INTERACTION_MODE_SELECT,
      walls: [],
      floors: [],
      water: [],
      surfaces: [],
      objects: [],
      selectedId: null,
      multiSelectedIds: [],
      activeLevel: 0,
      activeModelUrl: InteriorObjectModel.Cube,
      activeSurfaceType: InteriorSurfacePreset.Road,
      isCurved: true,
      currentDesignId: null,
      currentDesignName: null,
      hasUnsavedChanges: false,
      lastSaved: null,
      renderQuality: state.renderQuality,
      interactionActive: false,
      terrainSettings: createDefaultTerrainSettings(),
      terrainBrush: createDefaultTerrainBrush(),
      terrainMaterialPaint: createDefaultTerrainMaterialPaint(),
    })),
})
