import { describe, expect, it } from 'vitest'
import { GENERATION_MODES, GenerationMode } from '../generation-modes'
import { buildMidjourneyTilePromptText } from '@/shared/data/server/midjourney-params'

const FORBIDDEN_TILE_WORD = /\btile\b/i
const FORBIDDEN_SEAMLESS_EDGES = 'seamless edges'
const FORBIDDEN_PIXEL_SIZE = '512x512'
const PAINT_VOCABULARY = /painterly|\boil\b|brushwork/i
const NEGATION_PHRASE = /\bno\s/i

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
      expect(first, mode.id).not.toMatch(FORBIDDEN_TILE_WORD)
      expect(mode.promptFragment, mode.id).not.toMatch(FORBIDDEN_TILE_WORD)
      for (const prompt of [first, followUp]) {
        expect(prompt.toLowerCase(), mode.id).not.toContain(FORBIDDEN_SEAMLESS_EDGES)
        expect(prompt, mode.id).not.toContain(FORBIDDEN_PIXEL_SIZE)
      }
    }
  })

  it('reserves painterly, oil and brushwork for the painted isometric mode', () => {
    for (const mode of GENERATION_MODES) {
      const usesPaintVocabulary = PAINT_VOCABULARY.test(mode.promptFragment)
      expect(usesPaintVocabulary, mode.id).toBe(mode.id === GenerationMode.PaintedIsometric)
    }
  })

  it('keeps exclusions in negatives instead of negating inside the fragment', () => {
    for (const mode of GENERATION_MODES) {
      expect(mode.promptFragment, mode.id).not.toMatch(NEGATION_PHRASE)
    }
  })
})
