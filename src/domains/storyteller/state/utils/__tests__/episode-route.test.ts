import { describe, expect, it } from 'vitest'
import { resolveEpisodeId } from '@/domains/storyteller/state/utils/episode-route'
import { StorytellerQueryParam } from '@/domains/storyteller/core/storyteller-page-wire'

const CURRENT_EPISODE_ID = 'aa56a4c7-b7a7-403b-913e-61f6e6b5a82a'
const DETAIL_EPISODE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CLICK_EVENT = 'click'
const GENERATE_EVENT = 'generate'

describe('resolveEpisodeId', () => {
  it('uses the current episode when a click event has no episodeId', () => {
    expect(resolveEpisodeId(new Event(CLICK_EVENT), CURRENT_EPISODE_ID)).toBe(
      CURRENT_EPISODE_ID,
    )
  })

  it('prefers a string episode id over the fallback', () => {
    expect(resolveEpisodeId(DETAIL_EPISODE_ID, CURRENT_EPISODE_ID)).toBe(DETAIL_EPISODE_ID)
  })

  it('reads episodeId from a custom event detail', () => {
    const event = new CustomEvent(GENERATE_EVENT, {
      detail: { [StorytellerQueryParam.EpisodeId]: DETAIL_EPISODE_ID },
    })
    expect(resolveEpisodeId(event, CURRENT_EPISODE_ID)).toBe(DETAIL_EPISODE_ID)
  })
})
