import { AppModuleId, GameEntityKind } from '@/shared/data/constants/protocol'

export { AppModuleId, GameEntityKind }

export enum GameHubRouteId {
  Storyteller = 'storyteller',
  LoopCreator = 'loop-creator',
  WorldGen = 'world-gen',
  InteriorDesign = 'interior-design',
  AssetExporter = 'asset-exporter',
}

export enum GameHubDomainLabel {
  Storyteller = 'Storyteller',
  LoopCreator = 'Loop Creator',
  WorldBuilder = 'Infinite Canvas',
  InteriorDesigner = '3D Canvas',
  AssetExporter = 'Asset Exporter',
}

export enum GameHubDomainDescription {
  Storyteller = 'Write scripts, develop characters, build story world',
  LoopCreator = 'Design game loops, mechanics, and progression',
  WorldBuilder = 'Generate tile maps and world layouts',
  InteriorDesigner = 'Build 3D spaces and levels',
  AssetExporter = 'Convert 2D assets to 3D models',
}

export enum GameHubDomainGradient {
  Storyteller = 'from-purple-500 to-pink-500',
  LoopCreator = 'from-blue-500 to-cyan-500',
  WorldBuilder = 'from-green-500 to-emerald-500',
  InteriorDesigner = 'from-orange-500 to-red-500',
  AssetExporter = 'from-yellow-500 to-amber-500',
}

export enum GameHubDomainStats {
  ExportTools = 'Export tools',
}

export enum GameHubEntityStatsSuffix {
  Entities = 'entities',
}
