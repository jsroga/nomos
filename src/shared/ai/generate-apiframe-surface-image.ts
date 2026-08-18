import {
  generateApiframeImage,
  generateMidjourneyImages,
  resolveApiframeImageSelection,
} from '@/shared/ai/apiframe'
import {
  ApiframeErrorMessage,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'

export function buildMidjourneySurfacePrompt(
  prompt: string,
  aspectRatio: string,
  styleReferenceUrls?: string[],
): string {
  const refs = (styleReferenceUrls ?? []).filter(url => url.length > 0)
  const prefix = refs[0] ? `${refs[0]} ` : ''
  const sref =
    refs.length > 0 ? ` ${MidjourneyParamFlag.StyleRef} ${refs.join(' ')}` : ''
  return `${prefix}${prompt} ${MidjourneyParamFlag.AspectRatio} ${aspectRatio}${sref}`
}

export async function generateApiframeSurfaceImage(input: {
  model: ApiframeImageModel
  prompt: string
  apiKey: string
  aspectRatio: string
  styleReferenceUrls?: string[]
}): Promise<{ imageUrl: string; jobId: string; isVariantGrid: boolean }> {
  const styleReferenceUrls = (input.styleReferenceUrls ?? []).filter(url => url.length > 0)
  const result =
    input.model === ApiframeImageModel.Midjourney
      ? await generateMidjourneyImages(
          buildMidjourneySurfacePrompt(input.prompt, input.aspectRatio, styleReferenceUrls),
          input.apiKey,
          { aspectRatio: input.aspectRatio },
        )
      : await generateApiframeImage({
          model: input.model,
          prompt: input.prompt,
          apiKey: input.apiKey,
          aspectRatio: input.aspectRatio,
          imageInputUrls: styleReferenceUrls.length > 0 ? styleReferenceUrls : undefined,
        })
  const { imageUrl, isVariantGrid } = resolveApiframeImageSelection(result)
  if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
  return { imageUrl, jobId: result.jobId, isVariantGrid }
}
