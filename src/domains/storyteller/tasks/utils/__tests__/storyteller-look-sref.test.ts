import { describe, expect, it } from 'vitest'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { UrlScheme } from '@/shared/data/constants/protocol'
import {
  STORYTELLER_LOOK_SREF_URLS,
  StorytellerLookSrefUrl,
  appendStorytellerLookSref,
  storytellerLookSrefUrls,
} from '../storyteller-look-sref'

describe('storytellerLookSrefUrls', () => {
  it('starts with the two look-key urls', () => {
    expect(storytellerLookSrefUrls()).toEqual([
      StorytellerLookSrefUrl.One,
      StorytellerLookSrefUrl.Two,
    ])
    expect(STORYTELLER_LOOK_SREF_URLS).toHaveLength(2)
  })

  it('replaces the look key when the user selected style refs', () => {
    const extra = `${UrlScheme.Https}://cdn.example/extra.png`
    expect(storytellerLookSrefUrls([StorytellerLookSrefUrl.One, extra])).toEqual([
      StorytellerLookSrefUrl.One,
      extra,
    ])
  })

  it('keeps the look key when only a trailing moodboard key is present', () => {
    const key = `${UrlScheme.Https}://cdn.example/key.png`
    expect(storytellerLookSrefUrls([], [key])).toEqual([
      StorytellerLookSrefUrl.One,
      StorytellerLookSrefUrl.Two,
      key,
    ])
  })
})

describe('appendStorytellerLookSref', () => {
  it('appends a single --sref clause', () => {
    expect(appendStorytellerLookSref('scene')).toBe(
      `scene ${MidjourneyParamFlag.StyleRef} ${StorytellerLookSrefUrl.One} ${StorytellerLookSrefUrl.Two}`,
    )
  })
})
