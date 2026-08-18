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
  nextMidjourneyPromptAfterImageDenial,
} from '../midjourney-params'
import { tilePromptLayersFrom } from '../prompts'

const SREF_URLS = [
  'https://cdn.example.com/anchor.png',
  'https://cdn.example.com/preset.png',
  'https://cdn.example.com/third.png',
]
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

  it('puts the style anchor first in follow-up --sref', () => {
    const anchor = 'https://cdn.example.com/anchor.png'
    const preset = 'https://cdn.example.com/preset.png'
    const prompt = buildMidjourneyTilePromptText({
      isFirstTile: false,
      layers: LAYERS,
      styleReferenceUrls: [preset],
      styleAnchorUrl: anchor,
    })
    expect(prompt).toContain(
      `${MidjourneyParamFlag.StyleRef} ${anchor} ${preset}`
    )
  })

  it('omits the style anchor from the first-tile --sref list', () => {
    const anchor = 'https://cdn.example.com/anchor.png'
    const preset = 'https://cdn.example.com/preset.png'
    const prompt = buildMidjourneyTilePromptText({
      isFirstTile: true,
      layers: LAYERS,
      styleReferenceUrls: [preset],
      styleAnchorUrl: anchor,
    })
    expect(prompt).toContain(`${MidjourneyParamFlag.StyleRef} ${preset}`)
    expect(prompt).not.toContain(`${MidjourneyParamFlag.StyleRef} ${anchor}`)
  })
})

describe('nextMidjourneyPromptAfterImageDenial', () => {
  it('strips --sref urls first', () => {
    const prompt = [
      'shop isometric',
      `${MidjourneyParamFlag.StyleRef} ${SREF_URLS.join(' ')}`,
      `${MidjourneyParamFlag.No} ${MidjourneyBaseNegative.Text}`,
    ].join(' ')
    expect(nextMidjourneyPromptAfterImageDenial(prompt)).toBe(
      `shop isometric ${MidjourneyParamFlag.No} ${MidjourneyBaseNegative.Text}`
    )
  })

  it('strips a packed follow-up image url after srefs are gone', () => {
    const packed = 'https://cdn.example.com/packed.png'
    const prompt = `${packed} rainy harbour ${MidjourneyParamFlag.Stylize} ${MIDJOURNEY_STYLIZE}`
    expect(nextMidjourneyPromptAfterImageDenial(prompt)).toBe(
      `rainy harbour ${MidjourneyParamFlag.Stylize} ${MIDJOURNEY_STYLIZE}`
    )
  })

  it('strips sref before the leading packed image url', () => {
    const packed = 'https://cdn.example.com/packed.png'
    const withBoth = `${packed} quay ${MidjourneyParamFlag.StyleRef} ${SREF_URLS[0]}`
    const afterSref = nextMidjourneyPromptAfterImageDenial(withBoth)
    expect(afterSref).toBe(`${packed} quay`)
    expect(nextMidjourneyPromptAfterImageDenial(afterSref ?? '')).toBe('quay')
  })

  it('returns undefined when nothing to strip', () => {
    expect(nextMidjourneyPromptAfterImageDenial('a rainy harbour quay')).toBeUndefined()
  })
})
