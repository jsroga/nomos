export enum ModuleIdKey {
  Storyteller = 'storyteller',
  InteriorDesigner = '3d-canvas',
  LoopCreator = 'loop-creator',
  WorldGen = '2d-canvas',
  AssetExporter = 'asset-exporter',
}

export enum ModuleDisplayName {
  Storyteller = 'Storyteller',
  InteriorDesigner = '3D Canvas',
  LoopCreator = 'Loop Creator',
  WorldGen = 'Infinite Canvas',
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
