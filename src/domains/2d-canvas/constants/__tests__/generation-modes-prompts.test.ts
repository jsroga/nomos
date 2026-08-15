import { describe, expect, it } from 'vitest'
import { GENERATION_MODES } from '../generation-modes'
import { buildMidjourneyTilePromptText } from '@/shared/data/server/midjourney-params'

const FORBIDDEN_TILE_WORD = /\btile\b/i
const FORBIDDEN_SEAMLESS_EDGES = 'seamless edges'
const FORBIDDEN_PIXEL_SIZE = '512x512'

describe('Midjourney prompts for generation modes', () => {
  it('omits tile, seamless edges, and 512x512 for every mode including params', () => {
    for (const mode of GENERATION_MODES) {
      const layers = {
        tileDescription: 'a rainy harbour quay',
        masterPrompt: 'always overcast, wet cobbles',
        modePromptFragment: mode.promptFragment,
        styleContext: 'neon noir aesthetic, high contrast',
      }
      const first = buildMidjourneyTilePromptText({
        isFirstTile: true,
        layers,
        styleReferenceUrls: ['https://cdn.example.com/sref.png'],
        modeNegatives: mode.negatives,
      })
      const followUp = buildMidjourneyTilePromptText({
        isFirstTile: false,
        layers,
        styleReferenceUrls: ['https://cdn.example.com/sref.png'],
        modeNegatives: mode.negatives,
      })
      for (const prompt of [first, followUp]) {
        expect(prompt, mode.id).not.toMatch(FORBIDDEN_TILE_WORD)
        expect(prompt.toLowerCase(), mode.id).not.toContain(FORBIDDEN_SEAMLESS_EDGES)
        expect(prompt, mode.id).not.toContain(FORBIDDEN_PIXEL_SIZE)
      }
    }
  })
})
