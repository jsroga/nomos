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

  it('appends extra urls after the look key and drops duplicates', () => {
    expect(storytellerLookSrefUrls([StorytellerLookSrefUrl.One, `${UrlScheme.Https}://cdn.example/extra.png`])).toEqual([
      StorytellerLookSrefUrl.One,
      StorytellerLookSrefUrl.Two,
      `${UrlScheme.Https}://cdn.example/extra.png`,
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
