/**
 * 3D Canvas public module API.
 *
 * This is the only supported import target for code outside
 * src/domains/3d-canvas.
 */

export { InteriorDesignerWorkspace } from './ui'

export { useInteriorStore } from './state'
export { TERRAIN_QUALITY_RESOLUTION } from './core/interior-types'
export type { TextureStyle } from './prompts'
export { interiorDesignerApi } from './core/io/interior-designer.api'
export type { InteriorDesign } from './core/io/interior-designer.dto'

export {
  INTERIOR_DESIGNER_API_BASE_PATH,
  INTERIOR_DESIGNER_MODULE_ID,
  INTERIOR_DESIGNER_ROUTE_SEGMENT,
} from './config/module'

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
