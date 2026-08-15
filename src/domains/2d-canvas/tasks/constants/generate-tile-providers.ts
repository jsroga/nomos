import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { GenerateTileProvider } from './generate-tile'
import { generateTileViaApiframeModel } from './generate-tile-apiframe-models'
import { generateWithApiframeMidjourney } from './generate-tile-apiframe'

export async function generateTileImage(
  aiProvider: string,
  prompt: string,
  providerConfig: AiProviderConfig,
  isFirstTile: boolean,
  styleReferenceUrls: string[] | undefined,
  contextImageBase64: string | undefined,
  styleContext: string | undefined,
  masterPrompt?: string,
  modePromptFragment?: string,
  modeNegatives?: string[],
  styleAnchorUrl?: string,
): Promise<string> {
  switch (aiProvider) {
    case GenerateTileProvider.Gemini:
    case GenerateTileProvider.NanoBanana:
      return generateTileViaApiframeModel(
        ImageGenProvider.NanoBanana,
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext,
        masterPrompt,
        modePromptFragment,
        modeNegatives,
        styleAnchorUrl,
      )
    case GenerateTileProvider.Grok:
      return generateTileViaApiframeModel(
        ImageGenProvider.Grok,
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext,
        masterPrompt,
        modePromptFragment,
        modeNegatives,
        styleAnchorUrl,
      )
    case GenerateTileProvider.OpenAi:
      return generateTileViaApiframeModel(
        ImageGenProvider.OpenAi,
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext,
        masterPrompt,
        modePromptFragment,
        modeNegatives,
        styleAnchorUrl,
      )
    case GenerateTileProvider.Stability:
      return generateTileViaApiframeModel(
        ImageGenProvider.Stability,
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext,
        masterPrompt,
        modePromptFragment,
        modeNegatives,
        styleAnchorUrl,
      )
    case GenerateTileProvider.Midjourney:
      return generateWithApiframeMidjourney(
        prompt,
        providerConfig,
        isFirstTile,
        styleReferenceUrls,
        contextImageBase64,
        styleContext,
        masterPrompt,
        modePromptFragment,
        modeNegatives,
        styleAnchorUrl,
      )
    default:
      throw new Error(`Unsupported AI provider: ${aiProvider}`)
  }
}
