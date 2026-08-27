/**
 * Pins how `applyUpdatesToStoryPlan` merges each section, before SPEC-11 Task 7
 * moves the decision into the registry.
 *
 * The soundtrack bug lived here: every array went through `smartMergeArray`,
 * which keys on `title`, so a regenerated track merged into the old one and
 * kept its stale artist and dead URL. These assertions are what must not move.
 */
import { describe, expect, it } from 'vitest'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'

describe('applyUpdatesToStoryPlan, pinned per section', () => {
  it('REPLACES soundtracks — a regenerate is a fresh curated set', () => {
    const merged = applyUpdatesToStoryPlan(
      { soundtracks: [{ title: 'Ashes', artist: 'Old', url: 'dead' }] },
      { soundtracks: [{ title: 'Ashes', artist: 'New', url: 'live' }] }
    )

    expect(merged.soundtracks).toEqual([{ title: 'Ashes', artist: 'New', url: 'live' }])
  })

  it('APPENDS factions — adding one keeps the others', () => {
    const merged = applyUpdatesToStoryPlan(
      { factions: [{ name: 'Wardens' }] },
      { factions: [{ name: 'Ledgerkeepers' }] }
    )

    expect(merged.factions).toHaveLength(2)
  })

  it('APPENDS plot twists, items and events the same way', () => {
    const merged = applyUpdatesToStoryPlan(
      { plotTwists: [{ name: 'a' }], items: [{ name: 'b' }], events: [{ name: 'c' }] },
      { plotTwists: [{ name: 'x' }], items: [{ name: 'y' }], events: [{ name: 'z' }] }
    )

    expect(merged.plotTwists).toHaveLength(2)
    expect(merged.items).toHaveLength(2)
    expect(merged.events).toHaveLength(2)
  })

  it('DEEP-merges the episode roadmap, keeping untouched keys', () => {
    const merged = applyUpdatesToStoryPlan(
      { episodeRoadmap: { seasonStructure: { seasonLogline: 'keep' }, episodes: [] } },
      { episodeRoadmap: { episodes: [{ title: 'One' }] } }
    )

    const roadmap = merged.episodeRoadmap
    expect(roadmap).toMatchObject({ seasonStructure: { seasonLogline: 'keep' } })
  })

  it('DEEP-merges inspirations, which is a bucket object rather than an array', () => {
    const merged = applyUpdatesToStoryPlan(
      { inspirations: { books: [{ title: 'Dune' }], movies: [] } },
      { inspirations: { movies: [{ title: 'Alien' }] } }
    )

    expect(merged.inspirations).toMatchObject({ books: [{ title: 'Dune' }] })
  })

  it('OVERWRITES scalars', () => {
    const merged = applyUpdatesToStoryPlan(
      { worldDescription: 'before', genre: 'noir' },
      { worldDescription: 'after' }
    )

    expect(merged.worldDescription).toBe('after')
    expect(merged.genre).toBe('noir')
  })
})
