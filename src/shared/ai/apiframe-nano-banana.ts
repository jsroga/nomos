import {
  ApiframeErrorMessage,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import {
  generateApiframeImage,
  pickApiframeImageUrl,
  resolveNanoBananaModel,
} from '@/shared/ai/apiframe'
import { BufferEncoding } from '@/shared/data/constants/protocol'

/** Generate via Apiframe Nano Banana and return PNG base64 (no data: prefix). */
export async function generateNanoBananaBase64(input: {
  prompt: string
  apiKey: string
  modelId?: string
  imageInputUrls?: string[]
  aspectRatio?: string
}): Promise<string> {
  const model = resolveNanoBananaModel(input.modelId)
  const result = await generateApiframeImage({
    model,
    prompt: input.prompt,
    apiKey: input.apiKey,
    aspectRatio: input.aspectRatio,
    imageInputUrls: input.imageInputUrls,
    maxAttempts: 90,
  })
  const imageUrl = pickApiframeImageUrl(result)
  if (!imageUrl) throw new Error(ApiframeErrorMessage.NoImages)
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download Apiframe image: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer()).toString(BufferEncoding.Base64)
}

export { ApiframeImageModel }
