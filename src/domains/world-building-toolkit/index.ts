/**
 * World Building Toolkit public module API.
 */

export { useWorldStore, useWorldDataStore } from './state/useWorldStore'
export { useWorldUiStore } from './state/useWorldUiStore'
export type {
  Asset,
  Project,
  Tile,
  SelectBox,
  PendingUpscale,
  PendingGeneration,
  PendingFidelity,
  WorldState,
} from './state/useWorldStore'

export {
  useWorldProjects,
  useWorldTiles,
  useWorldAssets,
  useCreateWorldProjectMutation,
  useUpsertWorldTileMutation,
  useDeleteWorldTileMutation,
} from './state/queries/useWorldData'

export { worldApi } from './io/world.api'
export { worldKeys } from './io/world.keys'
export type { WorldProject, WorldTile, WorldAsset } from './io/world.dto'

export { Sidebar } from './ui/Sidebar/Sidebar'
export { WorldCanvas } from './ui/Canvas/WorldCanvas'
export { RepaintCanvas } from './ui/Canvas/RepaintCanvas'
export { RepaintToolbar } from './ui/RepaintToolbar'
export { SelectModeToolbar } from './ui/SelectModeToolbar'
export { WorldGenToolbar } from './ui/WorldGenToolbar'
export { TileReviewDialog } from './ui/TileReviewDialog'
export type { TileReviewType } from './ui/TileReviewDialog'
export { AssetsPanel } from './ui/AssetsPanel'
export { SettingsDialog } from './ui/SettingsDialog'
export { MjVariantPicker } from './ui/MjVariantPicker'

export { upscaleService } from './state/client-services/UpscaleService'
export { tileGenerationService } from './state/client-services/TileGenerationService'
export { fidelityService } from './state/client-services/FidelityService'
export { selectModeService } from './state/client-services/SelectModeService'
export { repaintService } from './state/client-services/RepaintService'

export {
  WORLD_BUILDING_TOOLKIT_API_BASE_PATH,
  WORLD_BUILDING_TOOLKIT_MODULE_ID,
  WORLD_BUILDING_TOOLKIT_ROUTE_SEGMENT,
} from './world-building-toolkit.config'
