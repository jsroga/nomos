import { ModuleTourConfig } from '@/shared/types/onboarding'
import { storytellerTourSteps } from './storyteller-tour'
import { interiorDesignerTourSteps } from './interior-designer-tour'
import { loopCreatorTourSteps } from './loop-creator-tour'
import { worldGenTourSteps } from './world-gen-tour'
import { assetExporterTourSteps } from './asset-exporter-tour'

export const MODULE_TOUR_CONFIGS: ModuleTourConfig[] = [
  {
    id: 'storyteller',
    name: 'Storyteller',
    routeMatch: /\/app\/[^/]+\/storyteller/,
    steps: storytellerTourSteps,
  },
  {
    id: 'interior-designer',
    name: 'Interior Designer',
    routeMatch: /\/app\/[^/]+\/interior-design/,
    steps: interiorDesignerTourSteps,
  },
  {
    id: 'loop-creator',
    name: 'Loop Creator',
    routeMatch: /\/app\/[^/]+\/loop-creator/,
    steps: loopCreatorTourSteps,
  },
  {
    id: 'world-gen',
    name: 'World Gen',
    routeMatch: /\/app\/[^/]+\/world-gen/,
    steps: worldGenTourSteps,
  },
  {
    id: 'asset-exporter',
    name: 'Asset Exporter',
    routeMatch: /\/app\/[^/]+\/asset-exporter/,
    steps: assetExporterTourSteps,
  },
]

export function getModuleConfigByUrl(url: string): ModuleTourConfig | undefined {
  return MODULE_TOUR_CONFIGS.find(config => config.routeMatch.test(url))
}
