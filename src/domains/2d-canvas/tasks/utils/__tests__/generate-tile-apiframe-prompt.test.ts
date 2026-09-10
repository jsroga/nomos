import { describe, expect, it } from 'vitest'
import { tileDescriptionDirective, tilePromptLayersFrom } from '@/shared/data/server/prompts'
import { FollowUpApiframeCopy } from '@/shared/data/server/constants/generation-prompts'
import {
  apiframeFollowUpImageUrls,
  composeNonMidjourneyTilePrompt,
} from '../generate-tile-apiframe-prompt'

const LAYERS = tilePromptLayersFrom({
  prompt: 'a collapsed lighthouse on a shingle beach',
  masterPrompt: 'a drowned trade city under permanent rain',
  modePromptFragment: 'hand-painted oil texture',
  styleContext: 'neon noir aesthetic',
})

const PACKED = 'https://cdn.example.com/packed-context.png'
const STYLE = 'https://cdn.example.com/sref.png'

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

describe('apiframeFollowUpImageUrls', () => {
  it('sends the packed context URL and never a style-ref URL', () => {
    const urls = apiframeFollowUpImageUrls(false, PACKED)
    expect(urls).toEqual([PACKED])
    expect(urls).not.toContain(STYLE)
  })

  it('omits images for first tile and when no packed canvas was uploaded', () => {
    expect(apiframeFollowUpImageUrls(true, PACKED)).toEqual([])
    expect(apiframeFollowUpImageUrls(false, undefined)).toEqual([])
  })
})
