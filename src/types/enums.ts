export enum AIProvider {
  OpenAI = 'openai',
  Gemini = 'gemini',
  NanoBanana = 'nano-banana',
  Stability = 'stability',
  Replicate = 'replicate',
  Fal = 'fal',
  Hyper3D = 'hyper3d',
  Meshy = 'meshy',
  Custom = 'custom',
  Mock = 'mock',
}

export enum AppTab {
  General = 'general',
  Upscaling = 'upscaling',
  APIKeys = 'apikeys',
}

export enum AppRoute {
  WorldBuilding = '/world-building',
  AssetExporter = '/asset-exporter',
  Login = '/login',
}

export enum EditorTool {
  None = 'none',
  Eraser = 'eraser',
  Inpaint = 'inpaint',
}

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum JobType {
  GenerateTile = 'generate-tile',
  UpscaleTile = 'upscale-tile',
  RepaintTile = 'repaint-tile',
  Generate3D = 'generate-3d',
}

// Helper types for configs
export interface AIConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  params?: Record<string, unknown>
}

export const ProviderConfigKeys: Record<AIProvider, string> = {
  [AIProvider.OpenAI]: 'ai-config-openai',
  [AIProvider.Gemini]: 'ai-config-gemini',
  [AIProvider.NanoBanana]: 'ai-config-nano-banana',
  [AIProvider.Stability]: 'ai-config-stability',
  [AIProvider.Replicate]: 'ai-config-replicate',
  [AIProvider.Fal]: 'ai-config-fal',
  [AIProvider.Hyper3D]: 'ai-config-hyper3d',
  [AIProvider.Meshy]: 'ai-config-meshy',
  [AIProvider.Custom]: 'ai-config-custom',
  [AIProvider.Mock]: 'ai-config-mock',
}

export const getEnumKeyByValue = (enumObj: unknown, value: string): string | undefined => {
  return Object.keys(enumObj as object).find(
    key => (enumObj as Record<string, unknown>)[key] === value
  )
}
