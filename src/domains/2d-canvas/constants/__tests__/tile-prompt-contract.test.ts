import { describe, expect, it } from 'vitest'
import { GENERATION_MODES, type GenerationModeDef } from '../generation-modes'
import { GENERATION_PROMPTS, tilePromptLayersFrom } from '@/shared/data/server/prompts'
import { buildMidjourneyTilePromptText } from '@/shared/data/server/midjourney-params'

const MASTER_PROMPT = 'a drowned trade city under permanent rain'
const TILE_PROMPT = 'a collapsed lighthouse on a shingle beach'
const STYLE_CONTEXT = 'neon noir aesthetic, high contrast'

/** Every reachable builder: Gemini/Grok/Apiframe share one, Midjourney/LegNext the other. */
function promptsSentToModels(
  mode: GenerationModeDef,
  isFirstTile: boolean,
  masterPrompt: string
): string[] {
  const layers = tilePromptLayersFrom({
    prompt: TILE_PROMPT,
    masterPrompt,
    modePromptFragment: mode.promptFragment,
    styleContext: STYLE_CONTEXT,
  })
  return [
    isFirstTile
      ? GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)
      : GENERATION_PROMPTS.FOLLOW_UP.MASTER(layers),
    buildMidjourneyTilePromptText({ isFirstTile, layers, modeNegatives: mode.negatives }),
  ]
}

describe('tile prompt contract', () => {
  it('carries the master prompt and the tile prompt on every path and mode', () => {
    for (const mode of GENERATION_MODES) {
      for (const isFirstTile of [true, false]) {
        for (const prompt of promptsSentToModels(mode, isFirstTile, MASTER_PROMPT)) {
          const label = `${mode.id} first=${isFirstTile}`
          expect(prompt, label).toContain(MASTER_PROMPT)
          expect(prompt, label).toContain(TILE_PROMPT)
        }
      }
    }
  })

  it('keeps both when the master prompt was seeded from the mode fragment', () => {
    for (const mode of GENERATION_MODES) {
      for (const prompt of promptsSentToModels(mode, true, mode.promptFragment)) {
        expect(prompt, mode.id).toContain(mode.promptFragment)
        expect(prompt, mode.id).toContain(TILE_PROMPT)
        expect(prompt.split(mode.promptFragment), mode.id).toHaveLength(2)
      }
    }
  })

  it('tells follow-up models to fill the grey hole', () => {
    for (const mode of GENERATION_MODES) {
      const [apiframe] = promptsSentToModels(mode, false, MASTER_PROMPT)
      expect(apiframe.toLowerCase(), mode.id).toMatch(/gr[ae]y/)
      expect(apiframe.toLowerCase(), mode.id).not.toContain('magenta')
    }
  })
})
