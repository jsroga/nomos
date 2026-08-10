import { describe, expect, it } from 'vitest'
import {
  WritersRoomSuggestionPrompt,
  WritersRoomSuggestionStage,
} from '@/domains/storyteller/config/constants/writers-room'
import {
  resolveWritersRoomSuggestionStage,
  resolveWritersRoomSuggestions,
  type WritersRoomBibleSignals,
} from '@/domains/storyteller/config/resolve-writers-room-suggestions'

const READY_BIBLE: WritersRoomBibleSignals = {
  worldDescription: 'A drowned city under glass.',
  worldRules: [{ rule: 'Tide Law' }],
  factions: [{ name: 'Glass Choir' }],
  plotTwists: ['The choir is the tide.'],
  themes: ['memory'],
  inspirations: { books: ['Dune'], movies: [], games: [] },
}

describe('resolveWritersRoomSuggestions', () => {
  it('focuses on bible parts when the storybible is empty', () => {
    const suggestions = resolveWritersRoomSuggestions({
      hasBible: false,
      hasEpisodes: false,
      currentEpisodeId: null,
      characterCount: 0,
      storyPlan: null,
    })
    expect(suggestions[0]).toBe(WritersRoomSuggestionPrompt.GenerateWorldDescription)
    expect(suggestions).toContain(WritersRoomSuggestionPrompt.GenerateWorldRules)
    expect(suggestions).not.toContain(WritersRoomSuggestionPrompt.DraftNextBeat)
  })

  it('asks for cast after the bible is ready enough', () => {
    const stage = resolveWritersRoomSuggestionStage({
      hasBible: true,
      hasEpisodes: false,
      currentEpisodeId: null,
      characterCount: 0,
      storyPlan: READY_BIBLE,
    })
    expect(stage).toBe(WritersRoomSuggestionStage.NeedCast)
    expect(
      resolveWritersRoomSuggestions({
        hasBible: true,
        hasEpisodes: false,
        currentEpisodeId: null,
        characterCount: 0,
        storyPlan: READY_BIBLE,
      })[0]
    ).toBe(WritersRoomSuggestionPrompt.CreateBibleCast)
  })

  it('hints creating the first episode when bible + cast exist', () => {
    const suggestions = resolveWritersRoomSuggestions({
      hasBible: true,
      hasEpisodes: false,
      currentEpisodeId: null,
      characterCount: 2,
      storyPlan: READY_BIBLE,
    })
    expect(suggestions[0]).toBe(WritersRoomSuggestionPrompt.CreateFirstEpisode)
    expect(suggestions).toContain(WritersRoomSuggestionPrompt.DraftFirstEpisodePremise)
  })

  it('returns writing tips once an episode is selected', () => {
    const suggestions = resolveWritersRoomSuggestions({
      hasBible: true,
      hasEpisodes: true,
      currentEpisodeId: 'ep-1',
      characterCount: 2,
      storyPlan: READY_BIBLE,
    })
    expect(suggestions).toEqual([
      WritersRoomSuggestionPrompt.DraftNextBeat,
      WritersRoomSuggestionPrompt.AddCharacter,
      WritersRoomSuggestionPrompt.CheckContinuity,
    ])
  })
})
