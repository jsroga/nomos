import {
  MarketingIconType,
  MarketingThreeDModelPath,
  resolveMarketingModelUrl,
} from '@/domains/marketing/constants/three-d-icon'

/** Resolve the runtime GLB URL for a marketing icon type (lite path). */
export function resolveIconModelUrl(type: string): string {
  switch (type) {
    case MarketingIconType.AiNarrative:
    case MarketingIconType.Neural:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.NeuralConnections)
    case MarketingIconType.SculptSim:
    case MarketingIconType.SecAst:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.EnchantedCosmosCode)
    case MarketingIconType.ExportSec:
    case MarketingIconType.Exporter:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.PredatorCosmos)
    case MarketingIconType.LoopDes:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.OceanicCosmos)
    case MarketingIconType.StrTst:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.Realistic14k)
    case MarketingIconType.WorldGen:
    case MarketingIconType.Generator:
    default:
      return resolveMarketingModelUrl(MarketingThreeDModelPath.Cosmos)
  }
}
