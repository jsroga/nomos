import { describe, expect, it } from 'vitest'
import { tileDescriptionDirective, tilePromptLayersFrom } from '@/shared/data/server/prompts'
import {
  FollowUpApiframeCopy,
  TileImageRoleCopy,
  TileImageRoleLabel,
} from '@/shared/data/server/constants/generation-prompts'
import {
  assembleTileProviderImages,
  composeApiframeTileGenerateParts,
  composeNonMidjourneyTilePrompt,
  TileProviderImageRole,
} from '../generate-tile-apiframe-prompt'

const LAYERS = tilePromptLayersFrom({
  prompt: 'a collapsed lighthouse on a shingle beach',
  masterPrompt: 'a drowned trade city under permanent rain',
  modePromptFragment: 'hand-painted oil texture',
  styleContext: 'neon noir aesthetic',
})

const PACKED = 'https://cdn.example.com/packed-context.png'
const STYLE = 'https://cdn.example.com/sref.png'
const STYLE_TWO = 'https://cdn.example.com/sref-2.png'
const STYLE_THREE = 'https://cdn.example.com/sref-3.png'
const TILE = 'https://cdn.example.com/existing-tile.png'

describe('composeNonMidjourneyTilePrompt', () => {
  it('uses first-tile copy when there is no neighbor', () => {
    const prompt = composeNonMidjourneyTilePrompt(true, LAYERS, undefined)
    expect(prompt).toContain(LAYERS.tileDescription)
    expect(prompt).toContain(LAYERS.masterPrompt)
    expect(prompt.toLowerCase()).not.toContain('new 1:1 square')
  })

  it('asks for the grey cell on the packed neighbor canvas', () => {
    const prompt = composeNonMidjourneyTilePrompt(false, LAYERS, ['pixel art'])
    expect(prompt).toContain(FollowUpApiframeCopy.PackedWorld)
    expect(prompt).toContain(FollowUpApiframeCopy.PackedKeepNeighbors)
    expect(prompt.toLowerCase()).toContain('do not zoom')
    expect(prompt.toLowerCase()).toContain('same zoom and position')
    expect(prompt).toContain(FollowUpApiframeCopy.MatchContract)
    expect(prompt).not.toContain('NEW 1:1 square')
    expect(prompt).toContain('Avoid:')
    expect(prompt).toContain('diamond shape')
    expect(prompt).toContain('pixel art')
    expect(prompt).toContain(LAYERS.masterPrompt)
    expect(prompt).toContain(tileDescriptionDirective(LAYERS.tileDescription))
    expect(prompt.toLowerCase()).not.toContain('inpaint')
    expect(prompt.toLowerCase()).not.toContain('magenta')
    expect(prompt.toLowerCase()).not.toContain('grey 1024')
  })
})

describe('assembleTileProviderImages', () => {
  it('puts packed context first, then every style URL', () => {
    const images = assembleTileProviderImages({
      isFirstTile: false,
      packedContextUrl: PACKED,
      styleReferenceUrls: [STYLE, STYLE_TWO, STYLE_THREE],
    })
    expect(images.map(image => image.url)).toEqual([PACKED, STYLE, STYLE_TWO, STYLE_THREE])
    expect(images[0]?.role).toBe(TileProviderImageRole.PackedContext)
    expect(images.slice(1).every(image => image.role === TileProviderImageRole.StyleReference)).toBe(
      true,
    )
  })

  it('sends style URLs on the first tile with no packed canvas', () => {
    const images = assembleTileProviderImages({
      isFirstTile: true,
      packedContextUrl: PACKED,
      styleReferenceUrls: [STYLE],
    })
    expect(images).toEqual([{ url: STYLE, role: TileProviderImageRole.StyleReference }])
  })

  it('treats the current tile as IMAGE 1 when restyling', () => {
    const images = assembleTileProviderImages({
      isFirstTile: false,
      packedContextUrl: TILE,
      styleReferenceUrls: [STYLE, STYLE_TWO],
      restyleExistingTile: true,
    })
    expect(images.map(image => image.url)).toEqual([TILE, STYLE, STYLE_TWO])
    expect(images[0]?.role).toBe(TileProviderImageRole.ExistingTile)
  })
})

describe('composeApiframeTileGenerateParts', () => {
  it('names IMAGE 1 as packed context and later images as style only', () => {
    const { text, imageUrls } = composeApiframeTileGenerateParts({
      isFirstTile: false,
      layers: LAYERS,
      packedContextUrl: PACKED,
      styleReferenceUrls: [STYLE, STYLE_TWO],
    })
    expect(imageUrls).toEqual([PACKED, STYLE, STYLE_TWO])
    expect(text).toContain(`${TileImageRoleLabel.Image} 1`)
    expect(text).toContain(TileImageRoleCopy.StyleTransfer)
    expect(text.toLowerCase()).toContain('grey cell')
  })

  it('restyles the existing tile without grey-hole follow-up copy', () => {
    const { text, imageUrls } = composeApiframeTileGenerateParts({
      isFirstTile: false,
      layers: LAYERS,
      packedContextUrl: TILE,
      styleReferenceUrls: [STYLE],
      restyleExistingTile: true,
    })
    expect(imageUrls).toEqual([TILE, STYLE])
    expect(text).toContain(TileImageRoleCopy.RestyleKeepLayout)
    expect(text.toLowerCase()).not.toContain('grey cell')
    expect(text).toContain(TileImageRoleCopy.StyleTransfer)
  })
})
