import { describe, expect, it } from 'vitest'
import { SoundtrackFieldAlias, StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { storytellerHydrationSignature } from '../storyteller-hydration-signature'

const PROJECT_ID = '9b80467c-18b5-4570-9b32-d66f86d71986'
const TRACK = { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/abc' }
const BOOK = { title: 'Dune', description: 'Sand.' }

describe('storytellerHydrationSignature', () => {
  it('is null without a project id', () => {
    expect(storytellerHydrationSignature({})).toBeNull()
    expect(storytellerHydrationSignature(null)).toBeNull()
  })

  it('is stable for identical soundtrack inspirations and mood', () => {
    const project = {
      id: PROJECT_ID,
      story_plan: {
        [StoryPlanMergeField.WorldDescription]: 'Aeternum',
        [StoryPlanMergeField.Soundtracks]: [TRACK],
        [StoryPlanMergeField.Inspirations]: { books: [BOOK], movies: [], games: [] },
        [SoundtrackFieldAlias.MoodSoundtrack]: 'Nocturne',
      },
      series_bible: {
        [StoryPlanMergeField.WorldDescription]: 'Aeternum',
      },
    }
    expect(storytellerHydrationSignature(project)).toBe(storytellerHydrationSignature(project))
  })

  it('changes when soundtrack length inspirations occupancy or mood change', () => {
    const base = {
      id: PROJECT_ID,
      story_plan: {
        [StoryPlanMergeField.WorldDescription]: 'Aeternum',
        [StoryPlanMergeField.WorldRules]: [{ rule: 'Age lock' }],
      },
      series_bible: {},
    }
    const first = storytellerHydrationSignature(base)
    const withTracks = storytellerHydrationSignature({
      ...base,
      series_bible: { [StoryPlanMergeField.Soundtracks]: [TRACK] },
    })
    const withMood = storytellerHydrationSignature({
      ...base,
      series_bible: { [SoundtrackFieldAlias.MoodSoundtrack]: 'Nocturne' },
    })
    const withBooks = storytellerHydrationSignature({
      ...base,
      series_bible: {
        [StoryPlanMergeField.Inspirations]: { books: [BOOK], movies: [], games: [] },
      },
    })
    expect(first).not.toBe(withTracks)
    expect(first).not.toBe(withMood)
    expect(first).not.toBe(withBooks)
  })
})
