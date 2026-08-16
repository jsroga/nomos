import { describe, expect, it } from 'vitest'
import {
  StorytellerBibleQuery,
  StorytellerBibleTab,
  StorytellerQueryParam,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { storytellerSearchParams } from '@/domains/storyteller/state/utils/strip-bible-search-params'

describe('storytellerSearchParams', () => {
  it('removes bible and bibleTab and keeps episodeId', () => {
    const source = new URLSearchParams({
      [StorytellerQueryParam.Bible]: StorytellerBibleQuery.Off,
      [StorytellerQueryParam.BibleTab]: StorytellerBibleTab.Relationships,
      [StorytellerQueryParam.EpisodeId]: 'ep-1',
    })

    const next = storytellerSearchParams(source)
    expect(next.get(StorytellerQueryParam.EpisodeId)).toBe('ep-1')
    expect(next.has(StorytellerQueryParam.Bible)).toBe(false)
    expect(next.has(StorytellerQueryParam.BibleTab)).toBe(false)
  })
})
