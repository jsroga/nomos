import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { GenerateTileProvider } from './generate-tile'
import { generateWithGemini } from './generate-tile-gemini'
import { generateWithOpenAI } from './generate-tile-openai'
import { generateWithStability } from './generate-tile-stability'
import { generateWithLegNext } from './generate-tile-legnext'

export async function generateTileImage(
  aiProvider: string,
  prompt: string,
  providerConfig: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls: string[] | undefined,
  contextImageBase64: string | undefined,
  styleContext: string | undefined
): Promise<string> {
  switch (aiProvider) {
    case GenerateTileProvider.Gemini:
    case GenerateTileProvider.NanoBanana:
      return generateWithGemini(
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext
      )
    case GenerateTileProvider.OpenAi:
      return generateWithOpenAI(
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64
      )
    case GenerateTileProvider.Stability:
      return generateWithStability(
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64
      )
    case GenerateTileProvider.Midjourney:
    case GenerateTileProvider.LegnextUploadPaint:
      return generateWithLegNext(
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext
      )
    default:
      throw new Error(`Unsupported AI provider: ${aiProvider}`)
  }
}
