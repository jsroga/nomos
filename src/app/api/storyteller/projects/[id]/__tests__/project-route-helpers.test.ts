import { describe, expect, it } from 'vitest'
import { StorytellerLegacyPlanField } from '@/domains/storyteller/core/storyteller-page-wire'
import { cleanProjectResponse } from '../project-route-helpers'

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
})
