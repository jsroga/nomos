import { describe, expect, it } from 'vitest'
import { GENERATION_MODES } from '../generation-modes'
import { GENERATION_PROMPTS } from '@/shared/data/server/prompts'

const FORBIDDEN_TILE_WORD = /\btile\b/i
const FORBIDDEN_SEAMLESS_EDGES = 'seamless edges'
const FORBIDDEN_PIXEL_SIZE = '512x512'

describe('Midjourney prompts for generation modes', () => {
  it('omits tile, seamless edges, and 512x512 for every mode', () => {
    for (const mode of GENERATION_MODES) {
      const layers = {
        tileDescription: 'a rainy harbour quay',
        masterPrompt: 'always overcast, wet cobbles',
        modePromptFragment: mode.promptFragment,
        styleContext: 'neon noir aesthetic, high contrast',
      }
      const first = GENERATION_PROMPTS.FIRST_TILE.MIDJOURNEY(layers)
      const followUp = GENERATION_PROMPTS.FOLLOW_UP.MIDJOURNEY(layers)
      for (const prompt of [first, followUp]) {
        expect(prompt, mode.id).not.toMatch(FORBIDDEN_TILE_WORD)
        expect(prompt.toLowerCase(), mode.id).not.toContain(FORBIDDEN_SEAMLESS_EDGES)
        expect(prompt, mode.id).not.toContain(FORBIDDEN_PIXEL_SIZE)
      }
    }
  })
})
