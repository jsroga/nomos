import { GENERATION_PROMPTS, type TilePromptLayers } from '@/shared/data/server/prompts'
import { MIDJOURNEY_VERSION } from '@/shared/ai/constants/apiframe'
import { StringSeparator, UrlScheme } from '@/shared/data/constants/protocol'

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

const STYLE_REF_URLS_PATTERN = new RegExp(
  `\\s*${MidjourneyParamFlag.StyleRef}\\s+(?:(?:${UrlScheme.Https}|${UrlScheme.Http}):\\/\\/\\S+[ \\t]*)+`,
  'i',
)

export function stripMidjourneyStyleRefClause(prompt: string): string {
  if (!prompt.includes(MidjourneyParamFlag.StyleRef)) return prompt.trim()
  return prompt.replace(STYLE_REF_URLS_PATTERN, ' ').replace(/[ \t]{2,}/g, ' ').trim()
}

export function stripLeadingHttpUrl(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed.startsWith(UrlScheme.Http)) return trimmed
  return trimmed.replace(/^\S+\s*/, '').trim()
}

export function nextMidjourneyPromptAfterImageDenial(prompt: string): string | undefined {
  const withoutStyleRefs = stripMidjourneyStyleRefClause(prompt)
  if (withoutStyleRefs !== prompt.trim()) return withoutStyleRefs
  const withoutLeadImage = stripLeadingHttpUrl(prompt)
  if (withoutLeadImage !== prompt.trim()) return withoutLeadImage
  return undefined
}

export function styleReferenceUrlsWithAnchor(
  styleReferenceUrls: string[] | undefined,
  styleAnchorUrl: string | undefined,
  isFirstTile: boolean
): string[] | undefined {
  if (isFirstTile || !styleAnchorUrl) return styleReferenceUrls
  const rest = (styleReferenceUrls ?? []).filter(url => url !== styleAnchorUrl)
  return [styleAnchorUrl, ...rest]
}

export function buildMidjourneyTilePromptText(input: {
  isFirstTile: boolean
  layers: TilePromptLayers
  styleReferenceUrls?: string[]
  modeNegatives?: string[]
  styleAnchorUrl?: string
}): string {
  const body = input.isFirstTile
    ? GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(input.layers)
    : GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(input.layers)
  return appendMidjourneyParams(body, {
    styleReferenceUrls: styleReferenceUrlsWithAnchor(
      input.styleReferenceUrls,
      input.styleAnchorUrl,
      input.isFirstTile
    ),
    modeNegatives: input.modeNegatives,
  })
}
