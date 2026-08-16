import {
  composeApiframeFollowUpPrompt,
  composeFirstTilePrompt,
  type TilePromptLayers,
} from '@/shared/data/server/prompts'

export function composeNonMidjourneyTilePrompt(
  isFirstTile: boolean,
  layers: TilePromptLayers,
  modeNegatives?: string[],
): string {
  if (isFirstTile) return composeFirstTilePrompt(layers)
  return composeApiframeFollowUpPrompt(layers, modeNegatives)
}

export function apiframeFollowUpImageUrls(
  isFirstTile: boolean,
  packedContextUrl: string | undefined,
): string[] {
  if (isFirstTile || !packedContextUrl) return []
  return [packedContextUrl]
}
