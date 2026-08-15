import { describe, expect, it } from 'vitest'
import {
  GENERATION_PROMPTS,
  composeFirstTilePrompt,
  composeFollowUpPrompt,
} from '../prompts'

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
})

describe('composeFollowUpPrompt', () => {
  it('keeps the same four-layer order', () => {
    const prompt = composeFollowUpPrompt(LAYERS)
    expect(prompt.indexOf(LAYERS.styleContext)).toBeGreaterThan(
      prompt.indexOf(LAYERS.modePromptFragment)
    )
  })
})
