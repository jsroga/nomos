import { describe, expect, it } from 'vitest'
import {
  ContextAssemblyFallback,
  ContextAssemblyHeading,
} from '@/domains/storyteller/services/constants/context-assembly'
import { RoadmapSlotCopy } from '@/domains/storyteller/core/utils/roadmap-slot'
import {
  buildProjectContextBlock,
  formatEpisodeIndexBlock,
  formatRoadmapSlotContextBlock,
  formatSeasonRoadmapBlock,
} from '../context-assembly-formatters'

const STORY_PLAN = {
  worldDescription: 'A frozen ward holds the last ledger.',
  episodeRoadmap: {
    episodes: [
      { title: 'The Ledger', logline: 'Vera hides a name.' },
      { title: 'The Bells', logline: 'The wardens arrive.' },
    ],
  },
}

describe('season roadmap context formatters', () => {
  it('renders nested episodeRoadmap as a numbered high-level list', () => {
    const block = formatSeasonRoadmapBlock(STORY_PLAN)
    expect(block).toContain('1. The Ledger: Vera hides a name.')
    expect(block).toContain('2. The Bells: The wardens arrive.')
  })

  it('binds slot N to episode sequence N', () => {
    const slot = formatRoadmapSlotContextBlock(STORY_PLAN, 1)
    expect(slot).toContain(`${RoadmapSlotCopy.ExpandPrefix}1${RoadmapSlotCopy.ExpandSuffix}`)
    expect(slot).toContain('The Ledger')
  })

  it('reports a missing slot past the end of the list', () => {
    expect(formatRoadmapSlotContextBlock(STORY_PLAN, 4)).toBe(
      `${RoadmapSlotCopy.MissingPrefix}4${RoadmapSlotCopy.MissingSuffix}`
    )
  })

  it('numbers the compact episode index', () => {
    const block = formatEpisodeIndexBlock([
      { sequence: 2, title: 'The Bells', logline: 'The wardens arrive.' },
      { sequence: 1, title: 'The Ledger', logline: 'Vera hides a name.' },
    ])
    expect(block).toContain('2. The Bells: The wardens arrive.')
  })

  it('injects season roadmap, episode index, and slot headings into project context', () => {
    const text = buildProjectContextBlock({
      projectName: 'Ward',
      meta: {
        genre: 'Thriller',
        tone: 'Cold',
        theme: 'Silence',
        premise: { logline: 'Vera hides a name.' },
      },
      storyPlan: STORY_PLAN,
      bible: {},
      episodeSequence: 1,
      episodeIndex: [{ sequence: 1, title: 'The Ledger', logline: 'Vera hides a name.' }],
    })
    expect(text).toContain(ContextAssemblyHeading.SeasonRoadmap)
    expect(text).toContain(ContextAssemblyHeading.EpisodeIndex)
    expect(text).toContain(ContextAssemblyHeading.RoadmapSlot)
    expect(text).toContain('1. The Ledger: Vera hides a name.')
    expect(text).not.toContain('=== SEQUENCES ===')
  })

  it('omits the slot block when no episode is open', () => {
    const text = buildProjectContextBlock({
      projectName: 'Ward',
      meta: {
        genre: 'Thriller',
        tone: 'Cold',
        theme: 'Silence',
        premise: {},
      },
      storyPlan: STORY_PLAN,
      bible: {},
      episodeIndex: [],
    })
    expect(text).toContain(ContextAssemblyHeading.SeasonRoadmap)
    expect(text).not.toContain(ContextAssemblyHeading.RoadmapSlot)
    expect(text).toContain(ContextAssemblyFallback.NoEpisodePremise)
  })
})
