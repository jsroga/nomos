import {
  APIFRAME_ASPECT_RATIO_PATTERN,
  ApiframeGptImage2OutputFormat,
  ApiframeGptImage2Param,
  ApiframeGptImage2Quality,
  ApiframeImageField,
  ApiframeImageModel,
  ApiframeParamsKey,
  type ApiframeImageUrlField,
} from '@/shared/ai/constants/apiframe'

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
  const [firstImageUrl] = imageInputUrls ?? []
  if (firstImageUrl) {
    const useUrlArray =
      imageField === ApiframeImageField.ImageInput ||
      imageField === ApiframeImageField.InputImages
    params[imageField] = useUrlArray ? imageInputUrls : firstImageUrl
  }
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
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.GrokImagine,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.Image),
      )
      return body
    case ApiframeImageModel.GptImage15:
      attachParamsIfPresent(
        body,
        ApiframeParamsKey.GptImage,
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImageInput),
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
        optionalAspectAndImages(aspectRatio, imageInputUrls, ApiframeImageField.ImagePrompt),
      )
      return body
    default:
      return body
  }
}
