import { describe, expect, it } from 'vitest'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import {
  inspirationsHaveItems,
  isPresentOverlapValue,
  isVacantHydrationValue,
  omitVacantSoundtrackInspirations,
} from '../bible-populated-fields'

const TRACK = { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/abc' }
const BOOK = { title: 'Dune', description: 'Sand.' }

describe('inspirationsHaveItems', () => {
  it('is false for empty buckets', () => {
    expect(inspirationsHaveItems({ books: [], movies: [], games: [] })).toBe(false)
  })

  it('is true when any bucket has items', () => {
    expect(inspirationsHaveItems({ books: [BOOK], movies: [], games: [] })).toBe(true)
  })
})

describe('isVacantHydrationValue', () => {
  it('treats empty soundtrack arrays as vacant', () => {
    expect(isVacantHydrationValue(StoryPlanMergeField.Soundtracks, [])).toBe(true)
    expect(isVacantHydrationValue(StoryPlanMergeField.Soundtracks, [TRACK])).toBe(false)
  })

  it('treats empty inspiration objects as vacant', () => {
    expect(
      isVacantHydrationValue(StoryPlanMergeField.Inspirations, {
        books: [],
        movies: [],
        games: [],
      }),
    ).toBe(true)
    expect(
      isVacantHydrationValue(StoryPlanMergeField.Inspirations, { books: [BOOK] }),
    ).toBe(false)
  })
})

describe('omitVacantSoundtrackInspirations', () => {
  it('drops empty soundtrack and inspirations keys', () => {
    expect(
      omitVacantSoundtrackInspirations({
        worldDescription: 'Keep',
        soundtracks: [],
        inspirations: { books: [], movies: [], games: [] },
      }),
    ).toEqual({ worldDescription: 'Keep' })
  })

  it('keeps populated lists', () => {
    expect(
      omitVacantSoundtrackInspirations({
        soundtracks: [TRACK],
        inspirations: { books: [BOOK], movies: [], games: [] },
      }),
    ).toEqual({
      soundtracks: [TRACK],
      inspirations: { books: [BOOK], movies: [], games: [] },
    })
  })
})

describe('isPresentOverlapValue', () => {
  it('treats empty inspiration buckets as absent', () => {
    expect(isPresentOverlapValue({ books: [], movies: [], games: [] })).toBe(false)
    expect(isPresentOverlapValue({ books: [BOOK], movies: [], games: [] })).toBe(true)
  })

  it('treats empty arrays as absent', () => {
    expect(isPresentOverlapValue([])).toBe(false)
    expect(isPresentOverlapValue([TRACK])).toBe(true)
  })
})
