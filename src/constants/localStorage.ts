export enum LocalStorageKeys {
  // AI Configuration
  AI_CONFIG_OPENAI = 'ai-config-openai',
  AI_CONFIG_GEMINI = 'ai-config-gemini',
  AI_CONFIG_NANO_BANANA = 'ai-config-nano-banana',
  AI_CONFIG_STABILITY = 'ai-config-stability',
  AI_CONFIG_REPLICATE = 'ai-config-replicate',
  AI_CONFIG_FAL = 'ai-config-fal',
  AI_CONFIG_HYPER3D = 'ai-config-hyper3d',
  AI_CONFIG_MESHY = 'ai-config-meshy',
  AI_CONFIG_LEGNEXT = 'ai-config-legnext',

  // General AI Settings
  AI_CONFIGS = 'ai-configs',
  AI_ACTIVE_MODEL = 'ai-active-model',
  AI_ACTIVE_UPSCALER = 'ai-active-upscaler',
  AI_SEGMENTATION_PROVIDER = 'ai-segmentation-provider',
  SKIP_GEMINI_PRE_UPSCALE = 'skip-gemini-pre-upscale',

  // Prompts
  FIDELITY_PROMPT = 'fidelity-prompt',
  MASTER_PROMPT = 'master-prompt',

  // Storyteller / Writers Room
  PREFERRED_MODEL_PROVIDER = 'preferredModelProvider',
  ANTHROPIC_API_KEY = 'anthropicApiKey',
  GEMINI_API_KEY = 'geminiApiKey',

  // UI Layout
  SIDEBAR_WIDTH = 'sidebar-width',

  // Temporary / Legacy
  STABILITY_API_KEY_LEGACY = 'STABILITY_API_KEY'
}

export const DynamicLocalStorageKeys = {
  upscaleRun: (tileId: string) => `upscale-run-${tileId}`,
  mjGrid: (tileId: string) => `mj-grid-${tileId}`,
  fidelityRun: (tileId: string) => `fidelity-run-${tileId}`,
  tileGen: (x: number, y: number) => `tile-gen-${x}-${y}`
}
