import {
  composeApiframeFollowUpPrompt,
  composeFirstTilePrompt,
  tileDescriptionDirective,
  type TilePromptLayers,
} from '@/shared/data/server/prompts'
import {
  TileImageRoleCopy,
  TileImageRoleJoin,
  TileImageRoleLabel,
  TileImageRoleSeparator,
  TileImageRoleToken,
} from '@/shared/data/server/constants/generation-prompts'
import { StringSeparator } from '@/shared/data/constants/protocol'

export enum TileProviderImageRole {
  PackedContext = 'packed-context',
  ExistingTile = 'existing-tile',
  StyleReference = 'style-reference',
}

export interface TileProviderImageInput {
  url: string
  role: TileProviderImageRole
}

export function assembleTileProviderImages(input: {
  isFirstTile: boolean
  packedContextUrl?: string
  styleReferenceUrls?: string[]
  restyleExistingTile?: boolean
}): TileProviderImageInput[] {
  const images: TileProviderImageInput[] = []
  if (input.packedContextUrl) {
    if (input.restyleExistingTile) {
      images.push({
        url: input.packedContextUrl,
        role: TileProviderImageRole.ExistingTile,
      })
    } else if (!input.isFirstTile) {
      images.push({
        url: input.packedContextUrl,
        role: TileProviderImageRole.PackedContext,
      })
    }
  }
  for (const url of input.styleReferenceUrls ?? []) {
    if (url.length === 0) continue
    images.push({ url, role: TileProviderImageRole.StyleReference })
  }
  return images
}

function imageLabel(index: number): string {
  return `${TileImageRoleLabel.Image} ${index}`
}

function joinImageLabels(indexes: readonly number[]): string {
  const labels = indexes.map(imageLabel)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0] ?? ''
  if (labels.length === 2) {
    return `${labels[0]}${TileImageRoleJoin.And}${labels[1]}`
  }
  const last = labels[labels.length - 1] ?? ''
  return `${labels.slice(0, -1).join(StringSeparator.CommaSpace)}${TileImageRoleJoin.FinalAnd}${last}`
}

function styleAppearanceLine(styleIndexes: readonly number[]): string {
  const images = joinImageLabels(styleIndexes)
  const shared =
    styleIndexes.length === 1
      ? TileImageRoleCopy.SharedAppearanceOne
      : TileImageRoleCopy.SharedAppearanceMany
  return `${shared.replace(TileImageRoleToken.Images, images)} ${TileImageRoleCopy.StyleTransfer}`
}

export function composeTileImageRoleInstructions(
  isFirstTile: boolean,
  images: readonly TileProviderImageInput[],
): string | undefined {
  if (images.length === 0) return undefined
  const lines: string[] = []
  if (isFirstTile) lines.push(TileImageRoleCopy.FirstTileScene)
  for (const [offset, image] of images.entries()) {
    const label = imageLabel(offset + 1)
    if (image.role === TileProviderImageRole.PackedContext) {
      lines.push(TileImageRoleCopy.PackedContext.split(TileImageRoleToken.Image).join(label))
    }
    if (image.role === TileProviderImageRole.ExistingTile) {
      lines.push(TileImageRoleCopy.ExistingTile.split(TileImageRoleToken.Image).join(label))
    }
  }
  const styleIndexes: number[] = []
  for (const [offset, image] of images.entries()) {
    if (image.role === TileProviderImageRole.StyleReference) {
      styleIndexes.push(offset + 1)
    }
  }
  if (styleIndexes.length > 0) lines.push(styleAppearanceLine(styleIndexes))
  return lines.join(TileImageRoleSeparator.Line)
}

export function composeNonMidjourneyTilePrompt(
  isFirstTile: boolean,
  layers: TilePromptLayers,
  modeNegatives?: string[],
  images: readonly TileProviderImageInput[] = [],
): string {
  const roles = composeTileImageRoleInstructions(isFirstTile, images)
  const body = isFirstTile
    ? composeFirstTilePrompt(layers)
    : composeApiframeFollowUpPrompt(layers, modeNegatives)
  if (!roles) return body
  return `${roles}${StringSeparator.DoubleNewline}${body}`
}

function joinPromptBlocks(blocks: Array<string | undefined>): string {
  return blocks.filter((block): block is string => Boolean(block && block.length > 0)).join(
    StringSeparator.DoubleNewline,
  )
}

export function composeRestyleTilePrompt(
  layers: TilePromptLayers,
  images: readonly TileProviderImageInput[],
): string {
  return joinPromptBlocks([
    composeTileImageRoleInstructions(false, images),
    TileImageRoleCopy.RestyleKeepLayout,
    layers.masterPrompt?.trim(),
    tileDescriptionDirective(layers.tileDescription),
  ])
}

export function composeApiframeTileGenerateParts(input: {
  isFirstTile: boolean
  layers: TilePromptLayers
  modeNegatives?: string[]
  packedContextUrl?: string
  styleReferenceUrls?: string[]
  restyleExistingTile?: boolean
}): { text: string; imageUrls: string[] } {
  const images = assembleTileProviderImages(input)
  const text = input.restyleExistingTile
    ? composeRestyleTilePrompt(input.layers, images)
    : composeNonMidjourneyTilePrompt(
        input.isFirstTile,
        input.layers,
        input.modeNegatives,
        images,
      )
  return {
    text,
    imageUrls: images.map(image => image.url),
  }
}
