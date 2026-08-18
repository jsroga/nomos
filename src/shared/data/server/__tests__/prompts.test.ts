import { describe, expect, it } from 'vitest'
import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  GENERATION_PROMPTS,
  composeApiframeFollowUpPrompt,
  composeFirstTilePrompt,
  composeFollowUpPrompt,
  tileDescriptionDirective,
} from '../prompts'
import {
  FollowUpApiframeCopy,
  GenerationPromptCopy,
} from '../constants/generation-prompts'

const OVERHEAD_PREFIX: string = GenerationPromptCopy.FirstTileOverheadPrefix

const LAYERS = {
  tileDescription: 'a rainy harbour quay',
  masterPrompt: 'always overcast, wet cobbles',
  modePromptFragment: 'hand-painted oil texture, visible brushwork',
  styleContext: 'neon noir aesthetic, high contrast',
}

describe('composeFirstTilePrompt', () => {
  it('stacks tile description, master prompt, mode fragment, then style context', () => {
    const prompt = composeFirstTilePrompt(LAYERS)
    expect(prompt.indexOf(LAYERS.tileDescription)).toBeGreaterThanOrEqual(0)
    expect(prompt.indexOf(LAYERS.masterPrompt)).toBeGreaterThan(
      prompt.indexOf(LAYERS.tileDescription)
    )
    expect(prompt.indexOf(LAYERS.modePromptFragment)).toBeGreaterThan(
      prompt.indexOf(LAYERS.masterPrompt)
    )
    expect(prompt.indexOf(LAYERS.styleContext)).toBeGreaterThan(
      prompt.indexOf(LAYERS.modePromptFragment)
    )
  })

  it('uses styleContext on the Gemini first-tile path', () => {
    const prompt = GENERATION_PROMPTS.FIRST_TILE.GEMINI(LAYERS)
    expect(prompt).toContain(LAYERS.styleContext)
    expect(prompt).toContain(LAYERS.tileDescription)
  })

  it('lets the mode fragment own the camera and falls back to overhead without one', () => {
    expect(composeFirstTilePrompt(LAYERS)).not.toContain(OVERHEAD_PREFIX)
    expect(
      composeFirstTilePrompt({ ...LAYERS, modePromptFragment: undefined })
    ).toContain(OVERHEAD_PREFIX)
  })

  it('emits the mode fragment once when the master prompt already carries it', () => {
    const prompt = composeFirstTilePrompt({
      ...LAYERS,
      masterPrompt: LAYERS.modePromptFragment,
    })
    expect(prompt.split(LAYERS.modePromptFragment)).toHaveLength(2)
  })

  it('puts a filled tile description only in the imporant directive', () => {
    const prompt = composeFirstTilePrompt({ ...LAYERS, tileDescription: 'shop' })
    const marked = tileDescriptionDirective('shop')
    expect(marked).toBeDefined()
    expect(prompt.startsWith(`${marked}${StringSeparator.DoubleNewline}`)).toBe(true)
    expect(prompt).not.toContain('shop, rendered as a cropped fragment')
    expect(prompt).toContain(GenerationPromptCopy.FirstTileCroppedFragment)
    expect(prompt.indexOf(LAYERS.masterPrompt)).toBeGreaterThan(prompt.indexOf('shop'))
  })

  it('omits the imporant line when the tile description is empty', () => {
    const prompt = composeFirstTilePrompt({ ...LAYERS, tileDescription: '   ' })
    expect(prompt).not.toContain(GenerationPromptCopy.TileDescriptionDirectivePrefix)
    expect(prompt).not.toContain('shop, rendered as a cropped fragment')
    expect(prompt.startsWith(GenerationPromptCopy.FirstTileCroppedFragment)).toBe(true)
  })
})

describe('composeFollowUpPrompt', () => {
  it('keeps the same four-layer order', () => {
    const prompt = composeFollowUpPrompt(LAYERS)
    expect(prompt.indexOf(LAYERS.styleContext)).toBeGreaterThan(
      prompt.indexOf(LAYERS.modePromptFragment)
    )
  })

  it('describes the grey context hole, not magenta', () => {
    const prompt = GENERATION_PROMPTS.FOLLOW_UP.MASTER(LAYERS)
    expect(prompt.toLowerCase()).toMatch(/gr[ae]y/)
    expect(prompt.toLowerCase()).not.toContain('magenta')
  })

  it('keeps packed neighbors when the tile description is empty', () => {
    const prompt = composeFollowUpPrompt({ ...LAYERS, tileDescription: '' })
    expect(prompt).toContain(FollowUpApiframeCopy.PackedWorld)
    expect(prompt).toContain(FollowUpApiframeCopy.PackedKeepNeighbors)
    expect(prompt).toContain(FollowUpApiframeCopy.MatchContract)
    expect(prompt).not.toContain(GenerationPromptCopy.TileDescriptionDirectivePrefix)
  })
})

describe('composeApiframeFollowUpPrompt', () => {
  it('asks for the grey cell on the packed neighbor canvas', () => {
    const prompt = composeApiframeFollowUpPrompt(LAYERS)
    expect(prompt).toContain(FollowUpApiframeCopy.PackedWorld)
    expect(prompt).toContain(FollowUpApiframeCopy.PackedKeepNeighbors)
    expect(prompt).toContain(FollowUpApiframeCopy.MatchContract)
    expect(prompt).toContain(LAYERS.masterPrompt)
    expect(prompt).toContain(LAYERS.tileDescription)
    expect(prompt.toLowerCase()).not.toContain('inpaint')
    expect(prompt.toLowerCase()).not.toContain('magenta')
    expect(prompt).toContain('Avoid:')
    expect(prompt).toContain('diamond shape')
  })

  it('marks the tile description when the user provided one', () => {
    const marked = tileDescriptionDirective(LAYERS.tileDescription)
    expect(marked).toBeDefined()
    expect(composeApiframeFollowUpPrompt(LAYERS)).toContain(marked)
    expect(composeFirstTilePrompt(LAYERS)).toContain(marked)
    expect(composeFollowUpPrompt(LAYERS)).toContain(marked)
  })

  it('omits the tile-description marker when the field is empty', () => {
    const empty = { ...LAYERS, tileDescription: '   ' }
    const prefix = GenerationPromptCopy.TileDescriptionDirectivePrefix
    expect(composeApiframeFollowUpPrompt(empty)).not.toContain(prefix)
    expect(composeFirstTilePrompt(empty)).not.toContain(prefix)
    expect(composeFollowUpPrompt(empty)).not.toContain(prefix)
  })
})
