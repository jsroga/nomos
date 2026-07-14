/**
 * Interior Designer public module API.
 *
 * This is the only supported import target for code outside
 * src/domains/interior-designer.
 */

export { InteriorDesignerWorkspace } from './ui'

export { useInteriorStore } from './state'
export { TERRAIN_QUALITY_RESOLUTION } from './core/interior-types'
export type { TextureStyle } from './prompts'
export { interiorDesignerApi } from './io/interior-designer.api'
export type { InteriorDesign } from './io/interior-designer.dto'

export {
  INTERIOR_DESIGNER_API_BASE_PATH,
  INTERIOR_DESIGNER_MODULE_ID,
  INTERIOR_DESIGNER_ROUTE_SEGMENT,
} from './interior-designer.config'

export type {
  Floor,
  GridResolution,
  InteractionMode,
  InteriorState,
  ObjectGroup,
  ObjectType,
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
} from './state'
