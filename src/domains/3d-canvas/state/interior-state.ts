import type { RenderQuality } from '@/domains/3d-canvas/constants/render-quality'
import type {
  Floor,
  GridResolution,
  InteractionMode,
  ObjectGroup,
  SceneObject,
  Surface,
  SurfaceType,
  TerrainBrushSettings,
  TerrainBrushType,
  TerrainMaterialPaintSettings,
  TerrainMaterialType,
  TerrainQuality,
  TerrainSettings,
  Wall,
  Water,
} from '../core/interior-types'

export interface InteriorState {
  mode: InteractionMode
  walls: Wall[]
  floors: Floor[]
  water: Water[]
  surfaces: Surface[]
  objects: SceneObject[]
  groups: ObjectGroup[]
  selectedId: string | null
  multiSelectedIds: string[]
  activeLevel: number
  activeModelUrl: string
  activeSurfaceType: SurfaceType
  isCurved: boolean
  exportRequested: boolean
  cameraResetRequested: boolean
  zenMode: boolean
  renderQuality: RenderQuality
  interactionActive: boolean

  currentDesignId: string | null
  currentDesignName: string | null
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean

  lockY: boolean
  snapEnabled: boolean
  snapSize: number
  transformMode: 'translate' | 'rotate' | 'scale'
  setLockY: (locked: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setSnapSize: (size: number) => void
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void

  requestRetextureExport: boolean
  retextureModelBase64: string | null
  setRequestRetextureExport: (requested: boolean) => void
  setRetextureModelBase64: (base64: string | null) => void
  previewRetexture: (elementId: string, retexturedUrl: string) => void
  revertRetexture: (elementId: string) => void
  approveRetexture: (elementId: string) => void
  cancelRetexture: (elementId: string) => void

  terrainSettings: TerrainSettings
  terrainBrush: TerrainBrushSettings
  terrainMaterialPaint: TerrainMaterialPaintSettings
  terrainBrushPosition: [number, number, number] | null

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
  flushHeightmapVersion: () => void
  autoFillWaterBelowLevel: () => void
  paintMaterialAt: (x: number, z: number, radius: number, material: TerrainMaterialType) => void
  resetTerrain: () => void
  resetInterior: () => void

  setMode: (mode: InteractionMode) => void
  setActiveLevel: (level: number) => void
  setActiveModelUrl: (url: string) => void
  setActiveSurfaceType: (type: SurfaceType) => void
  setIsCurved: (curved: boolean) => void
  setExportRequested: (requested: boolean) => void
  setCameraResetRequested: (requested: boolean) => void
  setZenMode: (enabled: boolean) => void
  toggleZenMode: () => void
  setRenderQuality: (quality: RenderQuality) => void
  setInteractionActive: (active: boolean) => void
  addWall: (wall: Omit<Wall, 'id'>) => void
  updateWall: (id: string, updates: Partial<Wall>) => void
  removeWall: (id: string) => void
  addFloor: (floor: Omit<Floor, 'id'>) => void
  updateFloor: (id: string, updates: Partial<Floor>) => void
  removeFloor: (id: string) => void
  addWater: (water: Omit<Water, 'id'>) => void
  updateWater: (id: string, updates: Partial<Water>) => void
  removeWater: (id: string) => void
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
  createGroup: (name: string, objectIds: string[]) => string
  addToGroup: (groupId: string, objectId: string) => void
  removeFromGroup: (objectId: string) => void
  deleteGroup: (groupId: string) => void
  selectGroup: (groupId: string) => void
  saveDesign: (projectId: string, name?: string) => Promise<void>
  loadDesign: (designId: string) => Promise<void>
  renameDesign: (designId: string, newName: string) => Promise<void>
  deleteDesign: (designId: string) => Promise<void>
  newDesign: () => void
  markUnsaved: () => void
}
