export enum ModuleIdKey {
  Storyteller = 'storyteller',
  InteriorDesigner = 'interior-designer',
  LoopCreator = 'loop-creator',
  WorldGen = 'world-gen',
  AssetExporter = 'asset-exporter',
}

export enum ModuleDisplayName {
  Storyteller = 'Storyteller',
  InteriorDesigner = 'Interior Designer',
  LoopCreator = 'Loop Creator',
  WorldGen = 'World Gen',
  AssetExporter = 'Asset Exporter',
}

export enum OnboardingAction {
  Complete = 'complete',
  Skip = 'skip',
  SkipAll = 'skipAll',
  Load = 'load',
}

export enum OnboardingQueryParam {
  UserId = 'userId',
}

export const MODULE_ID_VALUES: ModuleIdKey[] = [
  ModuleIdKey.Storyteller,
  ModuleIdKey.InteriorDesigner,
  ModuleIdKey.LoopCreator,
  ModuleIdKey.WorldGen,
  ModuleIdKey.AssetExporter,
]
