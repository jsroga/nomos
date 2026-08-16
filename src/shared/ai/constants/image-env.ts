/**
 * Semantic image-model env keys (Apiframe).
 * Available generate values: midjourney | nano-banana | nano-banana-pro | grok-imagine-image | gpt-image-1.5 | flux-2-pro
 * Available upscale values: topaz-image-upscale (canvas tiles always Topaz)
 * Available upscale modes: standard | creative
 * Available repaint values: flux-fill-pro
 */

export enum ImageEnvVar {
  ApiKey = 'APIFRAME_API_KEY',
  TileFirstModel = 'IMAGE_TILE_FIRST_MODEL',
  TileFollowUpModel = 'IMAGE_TILE_FOLLOW_UP_MODEL',
  MoodboardModel = 'IMAGE_MOODBOARD_MODEL',
  StoryboardModel = 'IMAGE_STORYBOARD_MODEL',
  EpisodePosterModel = 'IMAGE_EPISODE_POSTER_MODEL',
  SeriesPosterModel = 'IMAGE_SERIES_POSTER_MODEL',
  PortraitModel = 'IMAGE_PORTRAIT_MODEL',
  FidelityModel = 'IMAGE_FIDELITY_MODEL',
  UpscaleModel = 'IMAGE_UPSCALE_MODEL',
  UpscaleMode = 'IMAGE_UPSCALE_MODE',
  RepaintModel = 'IMAGE_REPAINT_MODEL',
  /** @deprecated Prefer IMAGE_TILE_FOLLOW_UP_MODEL */
  LegacyFollowUpProvider = 'FOLLOW_UP_IMAGE_PROVIDER',
  /** @deprecated Prefer IMAGE_TILE_FOLLOW_UP_MODEL */
  LegacyFollowUpModel = 'FOLLOW_UP_IMAGE_MODEL',
}

export enum ImageGenerateModelId {
  Midjourney = 'midjourney',
  NanoBanana = 'nano-banana',
  NanoBananaPro = 'nano-banana-pro',
  GrokImagineImage = 'grok-imagine-image',
  GptImage15 = 'gpt-image-1.5',
  Flux2Pro = 'flux-2-pro',
}

export enum ImageUpscaleModelId {
  TopazImageUpscale = 'topaz-image-upscale',
  ClarityUpscale = 'clarity-upscale',
  Midjourney = 'midjourney',
}

export enum ImageRepaintModelId {
  FluxFillPro = 'flux-fill-pro',
}

/** Topaz enhance preset for canvas tile upscale. */
export enum ImageUpscaleMode {
  Standard = 'standard',
  Creative = 'creative',
}

/** Short aliases still accepted for IMAGE_TILE_FOLLOW_UP_MODEL / legacy FOLLOW_UP_IMAGE_PROVIDER. */
export enum ImageModelAlias {
  Grok = 'grok',
  NanoBanana = 'nano-banana',
  Midjourney = 'midjourney',
  Gemini = 'gemini',
  OpenAi = 'openai',
  Stability = 'stability',
  Clarity = 'clarity',
  Topaz = 'topaz',
  Replicate = 'replicate',
}
