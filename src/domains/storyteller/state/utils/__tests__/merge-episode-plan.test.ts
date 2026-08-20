import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { EpisodePlanMergeField } from '@/domains/storyteller/state/constants/merge-episode-plan'
import { buildFallbackBiblePlan, buildMergedEpisodePlan } from '../merge-episode-plan'
import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'

const STORYBOARD_URL = `${UrlScheme.Https}://blob.example/storyboard.mp4`

describe('buildMergedEpisodePlan', () => {
  it('keeps storyboardUrl from the episode plan after reload', () => {
    const merged = buildMergedEpisodePlan(
      {
        [EpisodePlanMergeField.StoryPlan]: {
          storyboardUrl: STORYBOARD_URL,
        },
      },
      { id: 'proj-1', series_bible: {}, story_plan: {} },
    )
    expect(merged?.storyboardUrl).toBe(STORYBOARD_URL)
  })

  it('keeps moodImages string urls from the series bible', () => {
    const mood = `${UrlScheme.Https}://blob.example/mood-new.png`
    const merged = buildMergedEpisodePlan(
      {
        [EpisodePlanMergeField.StoryPlan]: {
          title: 'Ep 1',
        },
      },
      {
        id: 'proj-1',
        series_bible: { [StoryPlanMergeField.MoodImages]: [mood] },
        story_plan: {},
      },
    )
    expect(merged?.moodImages).toEqual([mood])
  })

  it('keeps the live episode posterUrl after merge', () => {
    const poster = `${UrlScheme.Https}://blob.example/poster_ep_1710000000000.png`
    const merged = buildMergedEpisodePlan(
      {
        [EpisodePlanMergeField.StoryPlan]: {
          posterUrl: poster,
        },
      },
      { id: 'proj-1', series_bible: {}, story_plan: {} },
    )
    expect(merged?.posterUrl).toBe(poster)
  })

  it('keeps bible inspirations when the episode plan has empty buckets', () => {
    const books = { books: [{ title: 'Dune', description: 'Sand.' }], movies: [], games: [] }
    const merged = buildMergedEpisodePlan(
      {
        [EpisodePlanMergeField.StoryPlan]: {
          [StoryPlanMergeField.Inspirations]: { books: [], movies: [], games: [] },
        },
      },
      {
        id: 'proj-1',
        series_bible: { [StoryPlanMergeField.Inspirations]: books },
        story_plan: {},
      },
    )
    expect(merged?.[StoryPlanMergeField.Inspirations]).toEqual(books)
  })
})

describe('buildFallbackBiblePlan', () => {
  it('keeps bible soundtracks when the story plan has an empty array', () => {
    const tracks = [
      { title: 'Theme', artist: 'A', youtubeUrl: `${UrlScheme.Https}://youtu.be/M6W4uhrLA7g` },
    ]
    const plan = buildFallbackBiblePlan({
      series_bible: { [StoryPlanMergeField.Soundtracks]: tracks },
      story_plan: { [StoryPlanMergeField.Soundtracks]: [] },
    })
    expect(plan?.[StoryPlanMergeField.Soundtracks]).toEqual(tracks)
  })
})
