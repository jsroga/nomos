/**
 * OpenRouter dedicated Image API (`POST /api/v1/images`) wire values.
 * @see https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */

export enum OpenRouterImageModel {
  /** xAI Grok Imagine — text + reference images → image. */
  GrokImagineImageQuality = 'x-ai/grok-imagine-image-quality',
}

export enum OpenRouterImageAspectRatio {
  Square = '1:1',
}

export enum OpenRouterImageResolution {
  OneK = '1K',
}

export enum OpenRouterImagePath {
  Images = '/images',
}

/** Optional override for follow-up Grok model id (`provider/model`). */
export const FOLLOW_UP_IMAGE_MODEL_ENV = 'FOLLOW_UP_IMAGE_MODEL'
