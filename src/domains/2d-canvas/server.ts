/**
 * Server-only 2D canvas exports.
 * Use in API routes and Trigger tasks — never import from the client barrel.
 */

export {
  worldAssetService,
  worldProjectService,
  worldTileService,
} from './services/world-data-service'
export { WORLD_QUERY_PARAM } from './constants/world-query-params'
export {
  absolutizeStyleReferenceUrls,
  isAllowedStyleRefMime,
  STYLE_REF_BLOB_PREFIX,
} from './utils/mj-sref'
export {
  generationModeDef,
  resolveGenerationMode,
  UpscaleStrategy,
} from './utils/generation-modes'
export {
  packedCropFromContext,
  type GenerateTileContextPayload,
  type GenerateTilePayload,
} from './tasks/utils/generate-tile'
export { ContextAssemblyVariant } from './constants/tile-generation-service'
export type { upscaleTileTask } from './tasks/upscale-tile.task'
export { UpscaleProvider } from './core/upscale-provider-wire'
export type { ProviderConfig } from './tasks/upscale-tile-providers'
