import { describe, expect, it } from 'vitest'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { hydratePlanFromBibleSources } from '../hydrate-plan-from-bible'

const TRACK = { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' }
const BOOK = { title: 'Dune', description: 'Sand.' }

describe('hydratePlanFromBibleSources', () => {
  it('fills soundtracks from the bible when the story plan has an empty array', () => {
    const plan = hydratePlanFromBibleSources(
      { [StoryPlanMergeField.Soundtracks]: [TRACK] },
      { [StoryPlanMergeField.Soundtracks]: [] },
    )
    expect(plan[StoryPlanMergeField.Soundtracks]).toEqual([TRACK])
  })

  it('fills inspirations from the bible when the story plan has empty buckets', () => {
    const plan = hydratePlanFromBibleSources(
      { [StoryPlanMergeField.Inspirations]: { books: [BOOK], movies: [], games: [] } },
      { [StoryPlanMergeField.Inspirations]: { books: [], movies: [], games: [] } },
    )
    expect(plan[StoryPlanMergeField.Inspirations]).toEqual({
      books: [BOOK],
      movies: [],
      games: [],
    })
  })
})
