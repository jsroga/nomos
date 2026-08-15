import { GENERATION_PROMPTS, type TilePromptLayers } from '@/shared/data/server/prompts'
import { MIDJOURNEY_VERSION } from '@/shared/ai/constants/apiframe'
import { StringSeparator } from '@/shared/data/constants/protocol'

export enum MidjourneyBaseNegative {
  Border = 'border',
  Frame = 'frame',
  Vignette = 'vignette',
  WhiteBackground = 'white background',
  DiamondShape = 'diamond shape',
  IsolatedObject = 'isolated object',
  DropShadow = 'drop shadow',
  UiIcon = 'ui icon',
  Text = 'text',
  Watermark = 'watermark',
}

export const MIDJOURNEY_ASPECT_RATIO = '1:1'
export const MIDJOURNEY_STYLIZE = 100

export enum MidjourneyStylePreset {
  Raw = 'raw',
}

export enum MidjourneyParamFlag {
  AspectRatio = '--ar',
  Version = '--v',
  Style = '--style',
  Stylize = '--s',
  StyleRef = '--sref',
  No = '--no',
}

export function buildMidjourneyParamSuffix(options: {
  styleReferenceUrls?: string[]
  modeNegatives?: string[]
}): string {
  const negatives = [
    ...Object.values(MidjourneyBaseNegative),
    ...(options.modeNegatives ?? []),
  ]
  const parts = [
    `${MidjourneyParamFlag.AspectRatio} ${MIDJOURNEY_ASPECT_RATIO}`,
    `${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION}`,
    `${MidjourneyParamFlag.Style} ${MidjourneyStylePreset.Raw}`,
    `${MidjourneyParamFlag.Stylize} ${MIDJOURNEY_STYLIZE}`,
  ]
  if (options.styleReferenceUrls?.length) {
    parts.push(`${MidjourneyParamFlag.StyleRef} ${options.styleReferenceUrls.join(' ')}`)
  }
  parts.push(`${MidjourneyParamFlag.No} ${negatives.join(StringSeparator.CommaSpace)}`)
  return parts.join(' ')
}

export function appendMidjourneyParams(
  prompt: string,
  options: {
    styleReferenceUrls?: string[]
    modeNegatives?: string[]
  }
): string {
  return `${prompt} ${buildMidjourneyParamSuffix(options)}`
}

export function buildMidjourneyTilePromptText(input: {
  isFirstTile: boolean
  layers: TilePromptLayers
  styleReferenceUrls?: string[]
  modeNegatives?: string[]
}): string {
  const body = input.isFirstTile
    ? GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(input.layers)
    : GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(input.layers)
  return appendMidjourneyParams(body, {
    styleReferenceUrls: input.styleReferenceUrls,
    modeNegatives: input.modeNegatives,
  })
}
