/**
 * Interior-designer public module API.
 *
 * This is the only supported interior-designer import target for code outside
 * src/domains/interior-designer while the module is migrated onto the unified
 * blueprint.
 */

export { InteriorDesignerWorkspace } from './ui/InteriorDesignerWorkspace'

export type {
  CreateInteriorDesignRequest,
  DeleteInteriorDesignResponse,
  InteriorDesignDetail,
  InteriorDesignSceneData,
  InteriorDesignSummary,
  InteriorDesignerJobStatus,
  RetextureRequest,
  RetextureStartResponse,
  SurfaceMaterialRequest,
  SurfaceMaterialStartResponse,
  TextTo3DRequest,
  TextTo3DStartResponse,
  TextureGenerationRequest,
  TextureGenerationResponse,
  UpdateInteriorDesignRequest,
} from './io/interior-designer.dto'
