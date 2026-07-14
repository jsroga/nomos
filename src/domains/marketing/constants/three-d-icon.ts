export enum MarketingIconType {
  WorldGen = 'WORLD_GEN',
  AiNarrative = 'AI_NARRATIVE',
  SculptSim = 'SCULPT_SIM',
  ExportSec = 'EXPORT_SEC',
  LoopDes = 'LOP_DES',
  StrTst = 'STR_TST',
  SecAst = 'SEC_AST',
  Generator = 'GENERATOR',
  Neural = 'NEURAL',
  Exporter = 'EXPORTER',
}

export enum MarketingThreeDModelPath {
  Cosmos = '/3d-models/Meshy_AI_Generate_the_cosmos__0120111501_texture.glb',
  NeuralConnections = '/3d-models/Meshy_AI_Neural_Connections_0120093533_texture.glb',
  EnchantedCosmosCode = '/3d-models/Meshy_AI_Enchanted_Cosmos_Code_0120111422_texture.glb',
  PredatorCosmos = '/3d-models/Meshy_AI_Predator_of_the_Cosmo_0120111442_texture.glb',
  OceanicCosmos = '/3d-models/Meshy_AI_Oceanic_Cosmos_Predat_0120111415_texture.glb',
  Realistic14k = '/3d-models/Meshy_AI_Realistic_14k_textur_0120110958_texture.glb',
}

export enum MarketingThreeDColor {
  KurvitzaDefault = '#a855f7',
  White = '#ffffff',
  WhiteUpper = '#FFFFFF',
}

export enum MarketingPointCloudAttribute {
  Position = 'position',
  Size = 'size',
  Brightness = 'brightness',
}

export enum MarketingDomEvent {
  MouseMove = 'mousemove',
}

export enum MarketingThreeDLayout {
  Full = '100%',
  Relative = 'relative',
}

export const MARKETING_THREE_D_VIGNETTE_MASK =
  'radial-gradient(circle at center, black 30%, transparent 70%)'

export const MARKETING_THREE_D_LOAD_ERROR = 'Failed to load Three.js:'
