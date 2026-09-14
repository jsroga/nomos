import {
  ApiframeErrorMessage,
  ApiframeErrorToken,
  ApiframeImageModel,
} from '@/shared/ai/utils/apiframe'

/** Documented generate-image slots. Missing = array field with no published max. */
export enum ApiframeGenerateImageCapacity {
  None = 0,
  Singular = 1,
  /** Packed neighbor canvas or existing tile plus style-reference images. */
  Grok = 5,
  Flux2Pro = 8,
  NanoBanana = 14,
}

export function apiframeGenerateImageCapacity(
  model: ApiframeImageModel,
): number | undefined {
  switch (model) {
    case ApiframeImageModel.Midjourney:
      return ApiframeGenerateImageCapacity.None
    case ApiframeImageModel.GrokImagineImage:
      return ApiframeGenerateImageCapacity.Grok
    case ApiframeImageModel.Flux2Pro:
      return ApiframeGenerateImageCapacity.Flux2Pro
    case ApiframeImageModel.NanoBanana:
    case ApiframeImageModel.NanoBananaPro:
      return ApiframeGenerateImageCapacity.NanoBanana
    case ApiframeImageModel.GptImage15:
    case ApiframeImageModel.GptImage2:
      return undefined
    default:
      return ApiframeGenerateImageCapacity.Singular
  }
}

export function apiframeTooManyInputImagesMessage(
  model: ApiframeImageModel,
  count: number,
  max: number,
): string {
  return ApiframeErrorMessage.TooManyInputImages.replace(ApiframeErrorToken.Model, model)
    .replace(ApiframeErrorToken.Max, String(max))
    .replace(ApiframeErrorToken.Count, String(count))
}

export function assertApiframeGenerateImageCapacity(
  model: ApiframeImageModel,
  imageCount: number,
): void {
  if (model === ApiframeImageModel.Midjourney) return
  const max = apiframeGenerateImageCapacity(model)
  if (max === undefined || imageCount <= max) return
  throw new Error(apiframeTooManyInputImagesMessage(model, imageCount, max))
}
