import { describe, expect, it } from 'vitest'
import {
  formatRoadmapList,
  formatRoadmapSlotBrief,
  resolveRoadmapList,
  resolveRoadmapSlot,
  RoadmapSlotCopy,
} from '../roadmap-slot'

const NESTED_ROADMAP = {
  episodeRoadmap: {
    episodes: [
      { title: 'The Ledger', logline: 'Vera hides a name.', incitingIncident: 'The book opens.' },
      { title: 'The Bells', logline: 'The wardens arrive.', midpoint: 'The confession.' },
    ],
  },
}

const FLAT_SEQUENCES = {
  sequences: [
    { name: 'Pilot', description: 'The clinic opens at dusk.' },
    { name: 'Aftermath', description: 'The board takes the keys.' },
  ],
}

describe('resolveRoadmapList', () => {
  it('prefers nested episodeRoadmap.episodes over top-level sequences', () => {
    const list = resolveRoadmapList({
      ...NESTED_ROADMAP,
      sequences: [{ name: 'Ignored', description: 'Should not win.' }],
    })
    expect(list).toHaveLength(2)
    expect(list[0]?.title).toBe('The Ledger')
    expect(list[0]?.logline).toBe('Vera hides a name.')
    expect(list[0]?.incitingIncident).toBe('The book opens.')
  })

  it('prefers episodeRoadmap.episodes when both nested keys exist', () => {
    const list = resolveRoadmapList({
      episodeRoadmap: {
        episodes: [{ title: 'FromEpisodes', logline: 'A' }],
        sequences: [{ title: 'FromSequences', logline: 'B' }],
      },
    })
    expect(list).toHaveLength(1)
    expect(list[0]?.title).toBe('FromEpisodes')
  })

  it('uses episodeRoadmap.sequences when episodes is empty', () => {
    const list = resolveRoadmapList({
      episodeRoadmap: {
        episodes: [],
        sequences: [{ title: 'Alias', logline: 'Legacy shape.' }],
      },
    })
    expect(list).toHaveLength(1)
    expect(list[0]?.title).toBe('Alias')
  })

  it('falls back to top-level sequences', () => {
    const list = resolveRoadmapList(FLAT_SEQUENCES)
    expect(list).toHaveLength(2)
    expect(list[0]?.title).toBe('Pilot')
    expect(list[0]?.description).toBe('The clinic opens at dusk.')
  })

  it('lets overlay sequences win when non-empty', () => {
    const list = resolveRoadmapList(NESTED_ROADMAP, [{ name: 'Local', description: 'Edited card.' }])
    expect(list).toHaveLength(1)
    expect(list[0]?.title).toBe('Local')
  })

  it('returns an empty list when nothing is stored', () => {
    expect(resolveRoadmapList({})).toEqual([])
  })
})

describe('resolveRoadmapSlot', () => {
  it('matches episode sequence 1 to the first item', () => {
    const slot = resolveRoadmapSlot(NESTED_ROADMAP, 1)
    expect(slot?.title).toBe('The Ledger')
  })

  it('matches the last item by sequence', () => {
    const slot = resolveRoadmapSlot(NESTED_ROADMAP, 2)
    expect(slot?.title).toBe('The Bells')
  })

  it('returns undefined past the end of the list', () => {
    expect(resolveRoadmapSlot(NESTED_ROADMAP, 3)).toBeUndefined()
  })

  it('returns undefined for a non-positive sequence', () => {
    expect(resolveRoadmapSlot(NESTED_ROADMAP, 0)).toBeUndefined()
  })
})

describe('formatRoadmapList / formatRoadmapSlotBrief', () => {
  it('numbers high-level titles and loglines', () => {
    const text = formatRoadmapList(resolveRoadmapList(NESTED_ROADMAP))
    expect(text).toContain('1. The Ledger: Vera hides a name.')
    expect(text).toContain('2. The Bells: The wardens arrive.')
  })

  it('explains a missing slot', () => {
    expect(formatRoadmapSlotBrief(undefined, 4)).toBe(
      `${RoadmapSlotCopy.MissingPrefix}4${RoadmapSlotCopy.MissingSuffix}`
    )
  })

  it('asks the model to expand a present slot', () => {
    const slot = resolveRoadmapSlot(NESTED_ROADMAP, 1)
    const text = formatRoadmapSlotBrief(slot, 1)
    expect(text).toContain(`${RoadmapSlotCopy.ExpandPrefix}1${RoadmapSlotCopy.ExpandSuffix}`)
    expect(text).toContain('The Ledger')
    expect(text).toContain('inciting:')
  })
})
