import { describe, expect, it } from 'vitest'
import {
  GENERATION_PROMPTS,
  composeFirstTilePrompt,
  composeFollowUpPrompt,
} from '../prompts'
import { GenerationPromptCopy } from '../constants/generation-prompts'

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
})
