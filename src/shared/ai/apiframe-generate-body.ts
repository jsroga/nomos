import { assertApiframeGenerateImageCapacity } from '@/shared/ai/apiframe-image-capacity'
import {
  APIFRAME_ASPECT_RATIO_PATTERN,
  ApiframeGptImage2OutputFormat,
  ApiframeGptImage2Param,
  ApiframeGptImage2Quality,
  ApiframeImageField,
  ApiframeImageModel,
  ApiframeParamsKey,
  type ApiframeImageUrlField,
} from '@/shared/ai/utils/apiframe'

export function extractApiframeAspectRatio(prompt: string): string | undefined {
  const match = APIFRAME_ASPECT_RATIO_PATTERN.exec(prompt)
  return match?.[1]
}

function optionalAspectAndImages(
  aspectRatio: string | undefined,
  imageInputUrls: string[] | undefined,
  imageField: ApiframeImageUrlField,
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (aspectRatio) params[ApiframeImageField.AspectRatio] = aspectRatio
  if (!imageInputUrls?.length) return params
  const useUrlArray =
    imageField === ApiframeImageField.ImageInput ||
    imageField === ApiframeImageField.InputImages
  const [firstImageUrl] = imageInputUrls
  params[imageField] = useUrlArray ? imageInputUrls : firstImageUrl
  return params
}

function grokImagineImageValue(imageInputUrls: string[]): string | string[] {
  const [firstImageUrl] = imageInputUrls
  if (imageInputUrls.length === 1 && firstImageUrl) return firstImageUrl
  return imageInputUrls
}

function grokImagineParams(
  aspectRatio: string | undefined,
  imageInputUrls: string[] | undefined,
): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (aspectRatio) params[ApiframeImageField.AspectRatio] = aspectRatio
  if (!imageInputUrls?.length) return params
  params[ApiframeImageField.Image] = grokImagineImageValue(imageInputUrls)
  return params
}

function attachParamsIfPresent(
  body: Record<string, unknown>,
  key: ApiframeParamsKey,
  params: Record<string, unknown>,
): void {
  if (Object.keys(params).length > 0) body[key] = params
}

export function buildGenerateBody(options: {
  model: ApiframeImageModel
  prompt: string
  aspectRatio?: string
  imageInputUrls?: string[]
}): Record<string, unknown> {
  const { model, prompt, aspectRatio, imageInputUrls } = options
  assertApiframeGenerateImageCapacity(model, imageInputUrls?.length ?? 0)
  const body: Record<string, unknown> = { model, prompt }

  switch (model) {
    case ApiframeImageModel.Midjourney: {
      const ar = aspectRatio ?? extractApiframeAspectRatio(prompt)
      if (ar) body[ApiframeParamsKey.Midjourney] = { aspect_ratio: ar }
      return body
    }
    case ApiframeImageModel.NanoBanana:
    case ApiframeImageModel.NanoBananaPro:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.NanoBanana,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImageInput),
      )
      return body
    case ApiframeImageModel.GrokImagineImage:
      attachParamsIfPresent(body, ApiframeParamsKey.GrokImagine, grokImagineParams(aspectRatio, imageInputUrls))
      return body
    case ApiframeImageModel.GptImage15:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.GptImage,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.InputImages),
      )
      return body
    case ApiframeImageModel.GptImage2: {
      const params = optionalAspectAndImages(
        aspectRatio,
        imageInputUrls,
        ApiframeImageField.InputImages,
      )
      params[ApiframeGptImage2Param.Quality] = ApiframeGptImage2Quality.High
      params[ApiframeGptImage2Param.OutputFormat] = ApiframeGptImage2OutputFormat.Png
      attachParamsIfPresent(body, ApiframeParamsKey.GptImage2, params)
      return body
    }
    case ApiframeImageModel.Flux2Pro:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.Flux,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.InputImages),
      )
      return body
    default:
      return body
  }
}
