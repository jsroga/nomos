import { describe, expect, it } from 'vitest'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import {
  bibleOwnedFieldsMissingFromCanon,
  inspirationsHaveItems,
  isPresentOverlapValue,
  isVacantHydrationValue,
  omitBibleOwnedPlanFields,
  omitVacantSoundtrackInspirations,
  pickBibleOwnedPlanFields,
  populatedSoundtrackInspirations,
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

describe('populatedSoundtrackInspirations', () => {
  it('keeps tracks from a later source when the first copy is empty', () => {
    expect(
      populatedSoundtrackInspirations(
        { soundtracks: [] },
        { soundtracks: [TRACK] },
      ),
    ).toEqual({ soundtracks: [TRACK] })
  })
})

describe('omitBibleOwnedPlanFields', () => {
  it('keeps episode fields and drops soundtrack copies', () => {
    expect(
      omitBibleOwnedPlanFields({
        premise: { logline: 'A hunt.' },
        soundtracks: [TRACK],
        inspirations: { books: [BOOK], movies: [], games: [] },
        posterUrl: 'https://blob.example/p.png',
      }),
    ).toEqual({
      premise: { logline: 'A hunt.' },
      posterUrl: 'https://blob.example/p.png',
    })
  })
})

describe('pickBibleOwnedPlanFields', () => {
  it('returns only populated bible-owned keys', () => {
    expect(
      pickBibleOwnedPlanFields({
        premise: { logline: 'A hunt.' },
        soundtracks: [TRACK],
        inspirations: { books: [], movies: [], games: [] },
      }),
    ).toEqual({ soundtracks: [TRACK] })
  })
})

describe('bibleOwnedFieldsMissingFromCanon', () => {
  it('copies episode tracks when the bible blobs have none', () => {
    expect(
      bibleOwnedFieldsMissingFromCanon(
        [{ worldDescription: 'A still world.' }],
        [{ soundtracks: [TRACK], inspirations: { books: [BOOK], movies: [], games: [] } }],
      ),
    ).toEqual({
      soundtracks: [TRACK],
      inspirations: { books: [BOOK], movies: [], games: [] },
    })
  })

  it('is empty when the bible already has tracks', () => {
    expect(
      bibleOwnedFieldsMissingFromCanon([{ soundtracks: [TRACK] }], [{ soundtracks: [TRACK] }]),
    ).toEqual({})
  })
})
