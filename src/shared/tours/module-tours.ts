import { ModuleTourConfig } from '@/shared/types/onboarding'
import { ModuleDisplayName, ModuleIdKey } from '@/shared/types/constants/onboarding'
import { storytellerTourSteps } from './storyteller-tour'
import { interiorDesignerTourSteps } from './interior-designer-tour'
import { loopCreatorTourSteps } from './loop-creator-tour'
import { worldGenTourSteps } from './world-gen-tour'
import { assetExporterTourSteps } from './asset-exporter-tour'

export const MODULE_TOUR_CONFIGS: ModuleTourConfig[] = [
  {
    id: ModuleIdKey.Storyteller,
    name: ModuleDisplayName.Storyteller,
    routeMatch: /\/app\/[^/]+\/storyteller/,
    steps: storytellerTourSteps,
  },
  {
    id: ModuleIdKey.InteriorDesigner,
    name: ModuleDisplayName.InteriorDesigner,
    routeMatch: /\/app\/[^/]+\/3d-canvas/,
    steps: interiorDesignerTourSteps,
  },
  {
    id: ModuleIdKey.LoopCreator,
    name: ModuleDisplayName.LoopCreator,
    routeMatch: /\/app\/[^/]+\/loop-creator/,
    steps: loopCreatorTourSteps,
  },
  {
    id: ModuleIdKey.WorldGen,
    name: ModuleDisplayName.WorldGen,
    routeMatch: /\/app\/[^/]+\/2d-canvas/,
    steps: worldGenTourSteps,
  },
  {
    id: ModuleIdKey.AssetExporter,
    name: ModuleDisplayName.AssetExporter,
    routeMatch: /\/app\/[^/]+\/asset-exporter/,
    steps: assetExporterTourSteps,
  },
]

export function getModuleConfigByUrl(url: string): ModuleTourConfig | undefined {
  return MODULE_TOUR_CONFIGS.find(config => config.routeMatch.test(url))
}
