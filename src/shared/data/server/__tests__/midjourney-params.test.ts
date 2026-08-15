import { describe, expect, it } from 'vitest'
import { MIDJOURNEY_VERSION } from '@/shared/ai/constants/apiframe'
import { StringSeparator } from '@/shared/data/constants/protocol'
import {
  MidjourneyBaseNegative,
  MidjourneyParamFlag,
  MidjourneyStylePreset,
  MIDJOURNEY_ASPECT_RATIO,
  MIDJOURNEY_STYLIZE,
  buildMidjourneyParamSuffix,
  buildMidjourneyTilePromptText,
} from '../midjourney-params'
import { tilePromptLayersFrom } from '../prompts'

const SREF_URLS = ['https://cdn.example.com/anchor.png', 'https://cdn.example.com/preset.png']
const MODE_NEGATIVES = ['pixel art', 'flat vector']

const LAYERS = tilePromptLayersFrom({
  prompt: 'a rainy harbour quay',
  masterPrompt: 'always overcast',
  modePromptFragment: 'hand-painted oil texture, visible brushwork',
  styleContext: 'neon noir aesthetic',
})

describe('buildMidjourneyParamSuffix', () => {
  it('emits v8.2 raw stylize, sref, and combined --no list', () => {
    const suffix = buildMidjourneyParamSuffix({
      styleReferenceUrls: SREF_URLS,
      modeNegatives: MODE_NEGATIVES,
    })
    expect(suffix).toBe(
      [
        `${MidjourneyParamFlag.AspectRatio} ${MIDJOURNEY_ASPECT_RATIO}`,
        `${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION}`,
        `${MidjourneyParamFlag.Style} ${MidjourneyStylePreset.Raw}`,
        `${MidjourneyParamFlag.Stylize} ${MIDJOURNEY_STYLIZE}`,
        `${MidjourneyParamFlag.StyleRef} ${SREF_URLS.join(' ')}`,
        `${MidjourneyParamFlag.No} ${[...Object.values(MidjourneyBaseNegative), ...MODE_NEGATIVES].join(StringSeparator.CommaSpace)}`,
      ].join(' ')
    )
  })
})

describe('Apiframe and LegNext Midjourney params', () => {
  it('share one param suffix for the same mode and sref list', () => {
    const options = { styleReferenceUrls: SREF_URLS, modeNegatives: MODE_NEGATIVES }
    const suffix = buildMidjourneyParamSuffix(options)
    const first = buildMidjourneyTilePromptText({ isFirstTile: true, layers: LAYERS, ...options })
    const followUp = buildMidjourneyTilePromptText({
      isFirstTile: false,
      layers: LAYERS,
      ...options,
    })
    expect(first.endsWith(suffix)).toBe(true)
    expect(followUp.endsWith(suffix)).toBe(true)
    expect(first.slice(first.length - suffix.length)).toBe(
      followUp.slice(followUp.length - suffix.length)
    )
  })
})
