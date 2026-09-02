import { describe, expect, it } from 'vitest'
import { StorytellerLegacyPlanField } from '@/domains/storyteller/core/storyteller-page-wire'
import { bibleOwnedBackfillFromEpisodes, cleanProjectResponse } from '../project-route-helpers'

const BOOKS = { books: [{ title: 'Dune', description: 'Sand.' }], movies: [], games: [] }
const EMPTY_INSPIRATIONS = { books: [], movies: [], games: [] }

describe('cleanProjectResponse', () => {
  it('keeps bible inspirations when the story plan only has empty buckets', () => {
    const cleaned = cleanProjectResponse({
      seriesBible: { [StorytellerLegacyPlanField.Inspirations]: BOOKS },
      storyPlan: { [StorytellerLegacyPlanField.Inspirations]: EMPTY_INSPIRATIONS },
    })
    expect(cleaned.seriesBible[StorytellerLegacyPlanField.Inspirations]).toEqual(BOOKS)
  })

  it('keeps soundtrack tracks from the project column when the table row omitted them', () => {
    const tracks = [{ title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' }]
    const cleaned = cleanProjectResponse({
      seriesBible: {},
      storyPlan: { soundtracks: tracks },
      storyPlanTable: { content: { worldDescription: 'A vast machine-ocean covers the planet.' } },
    })
    expect(cleaned.storyPlan.soundtracks).toEqual(tracks)
  })

  it('overlays leftover episode soundtrack onto the bible when the project blobs have none', () => {
    const tracks = [{ title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' }]
    const cleaned = cleanProjectResponse(
      {
        seriesBible: { moodImages: ['https://blob.example/m.png'] },
        storyPlan: { worldDescription: 'A still world.' },
      },
      [{ soundtracks: tracks, inspirations: BOOKS }],
    )
    expect(cleaned.seriesBible.soundtracks).toEqual(tracks)
    expect(cleaned.storyPlan.soundtracks).toEqual(tracks)
    expect(cleaned.seriesBible.inspirations).toEqual(BOOKS)
  })

  it('keeps bible soundtrack tracks when leftover episode lists differ', () => {
    const bibleTracks = [
      { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' },
    ]
    const episodeTracks = [
      { title: 'Other', artist: 'B', youtubeUrl: 'https://youtu.be/abcdefghijk' },
    ]
    const cleaned = cleanProjectResponse(
      {
        seriesBible: { soundtracks: bibleTracks },
        storyPlan: {},
      },
      [{ soundtracks: episodeTracks }],
    )
    expect(cleaned.seriesBible.soundtracks).toEqual(bibleTracks)
    expect(cleaned.storyPlan.soundtracks).toEqual(bibleTracks)
  })
})

describe('bibleOwnedBackfillFromEpisodes', () => {
  it('returns episode tracks when the project bible has none', () => {
    const tracks = [{ title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/M6W4uhrLA7g' }]
    expect(
      bibleOwnedBackfillFromEpisodes(
        { seriesBible: { moodImages: ['https://blob.example/m.png'] }, storyPlan: {} },
        [{ soundtracks: tracks }],
      ),
    ).toEqual({ soundtracks: tracks })
  })
})
