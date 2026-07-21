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

export { worldApi } from './core/io/world.api'
export { worldKeys } from './core/io/world.keys'
export type { WorldProject, WorldTile, WorldAsset } from './core/io/world.dto'

export { Sidebar } from './ui/components/Sidebar/Sidebar'
export { WorldCanvas } from './ui/components/Canvas/WorldCanvas'
export { RepaintCanvas } from './ui/components/Canvas/RepaintCanvas'
export { RepaintToolbar } from './ui/components/RepaintToolbar'
export { SelectModeToolbar } from './ui/components/SelectModeToolbar'
export { WorldGenToolbar } from './ui/components/WorldGenToolbar'
export { TileReviewDialog } from './ui/components/TileReviewDialog'
export type { TileReviewType } from './ui/components/TileReviewDialog'
export { AssetsPanel } from './ui/components/AssetsPanel'
export { SettingsDialog } from './ui/components/SettingsDialog'
export { MjVariantPicker } from './ui/components/MjVariantPicker'
export { WorldGenLayout } from './ui/WorldGenLayout'

export { upscaleService } from './state/client-services/upscale-service'
export { tileGenerationService } from './state/client-services/tile-generation-service'
export { fidelityService } from './state/client-services/fidelity-service'
export { selectModeService } from './state/client-services/select-mode-service'
export { repaintService } from './state/client-services/repaint-service'

export {
  WORLD_BUILDING_TOOLKIT_API_BASE_PATH,
  WORLD_BUILDING_TOOLKIT_MODULE_ID,
  WORLD_BUILDING_TOOLKIT_ROUTE_SEGMENT,
} from './world-building-toolkit.config'
