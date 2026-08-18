import { describe, expect, it } from 'vitest'
import { buildMidjourneySurfacePrompt } from '@/shared/ai/generate-apiframe-surface-image'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { ApiframeGenerateAspectRatio } from '@/shared/ai/constants/apiframe'

describe('buildMidjourneySurfacePrompt', () => {
  it('adds aspect ratio without style refs', () => {
    expect(
      buildMidjourneySurfacePrompt('cinematic poster', ApiframeGenerateAspectRatio.PortraitTwoThree),
    ).toBe(
      `cinematic poster ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.PortraitTwoThree}`,
    )
  })

  it('prefixes the first sref URL and appends --sref', () => {
    const first = 'https://cdn.example/a.png'
    const second = 'https://cdn.example/b.png'
    expect(
      buildMidjourneySurfacePrompt(
        'moodboard',
        ApiframeGenerateAspectRatio.Widescreen,
        [first, second],
      ),
    ).toBe(
      `${first} moodboard ${MidjourneyParamFlag.AspectRatio} ${ApiframeGenerateAspectRatio.Widescreen} ${MidjourneyParamFlag.StyleRef} ${first} ${second}`,
    )
  })
})
