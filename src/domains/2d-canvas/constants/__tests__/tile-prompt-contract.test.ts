import { describe, expect, it } from 'vitest'
import { GENERATION_MODES, type GenerationModeDef } from '../generation-modes'
import {
  composeApiframeFollowUpPrompt,
  GENERATION_PROMPTS,
  tilePromptLayersFrom,
} from '@/shared/data/server/prompts'
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
  const apiframe = isFirstTile
    ? GENERATION_PROMPTS.FIRST_TILE.GEMINI(layers)
    : composeApiframeFollowUpPrompt(layers, mode.negatives)
  return [
    apiframe,
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

  it('asks Grok follow-up to paint the grey cell in the packed canvas', () => {
    for (const mode of GENERATION_MODES) {
      const [apiframe, midjourney] = promptsSentToModels(mode, false, MASTER_PROMPT)
      expect(apiframe, mode.id).toContain('grey cell')
      expect(apiframe, mode.id).toContain('entire attached canvas')
      expect(apiframe, mode.id).not.toContain('NEW 1:1 square')
      expect(apiframe, mode.id).toContain('Avoid:')
      expect(apiframe.toLowerCase(), mode.id).not.toContain('inpaint')
      expect(apiframe.toLowerCase(), mode.id).not.toContain('magenta')
      expect(apiframe.toLowerCase(), mode.id).not.toContain('central gray')
      expect(apiframe.toLowerCase(), mode.id).not.toContain('central grey')
      expect(midjourney.toLowerCase(), mode.id).toContain('grey cell')
    }
  })
})
