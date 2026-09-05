/**
 * Pins how `applyUpdatesToStoryPlan` merges each section.
 *
 * Bible arrays replace on regenerate. Bible objects deep-merge so untouched
 * keys survive. Scalars overwrite.
 */
import { describe, expect, it } from 'vitest'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  MergeStrategy,
  SECTION_REGISTRY,
  WORLD_BIBLE_SECTIONS,
  type WorldBibleSection,
} from '@/domains/storyteller/core/bible/section-registry'

describe('applyUpdatesToStoryPlan, pinned per section', () => {
  it('REPLACES soundtracks — a regenerate is a fresh curated set', () => {
    const merged = applyUpdatesToStoryPlan(
      { soundtracks: [{ title: 'Ashes', artist: 'Old', url: 'dead' }] },
      { soundtracks: [{ title: 'Ashes', artist: 'New', url: 'live' }] }
    )

    expect(merged.soundtracks).toEqual([{ title: 'Ashes', artist: 'New', url: 'live' }])
  })

  it('REPLACES factions — a regenerate is a fresh list', () => {
    const merged = applyUpdatesToStoryPlan(
      { factions: [{ name: 'Wardens' }] },
      { factions: [{ name: 'Ledgerkeepers' }] }
    )

    expect(merged.factions).toEqual([{ name: 'Ledgerkeepers' }])
  })

  it('REPLACES plot twists, items, events and world rules the same way', () => {
    const merged = applyUpdatesToStoryPlan(
      {
        plotTwists: [{ name: 'a' }],
        items: [{ name: 'b' }],
        events: [{ name: 'c' }],
        worldRules: [{ rule: 'old' }],
      },
      {
        plotTwists: [{ name: 'x' }],
        items: [{ name: 'y' }],
        events: [{ name: 'z' }],
        worldRules: [{ rule: 'new' }],
      }
    )

    expect(merged.plotTwists).toEqual([{ name: 'x' }])
    expect(merged.items).toEqual([{ name: 'y' }])
    expect(merged.events).toEqual([{ name: 'z' }])
    expect(merged.worldRules).toEqual([{ rule: 'new' }])
  })

  it('REPLACES cast instead of appending names', () => {
    const merged = applyUpdatesToStoryPlan(
      { cast: [{ name: 'Old' }], keyCharacters: [{ name: 'Old' }] },
      { cast: [{ name: 'New' }] }
    )

    expect(merged.cast).toEqual([{ name: 'New' }])
    expect(merged.keyCharacters).toEqual([{ name: 'New' }])
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

describe('SECTION_REGISTRY merge policy', () => {
  it('uses Replace for array sections and Deep for object sections', () => {
    const arraySections: WorldBibleSection[] = [
      BibleSection.WORLD_RULES,
      BibleSection.FACTIONS,
      BibleSection.PLOT_TWISTS,
      BibleSection.CAST,
      BibleSection.SOUNDTRACKS,
      BibleSection.ITEMS,
      BibleSection.EVENTS,
    ]
    const objectSections: WorldBibleSection[] = [
      BibleSection.INSPIRATIONS,
      BibleSection.EPISODE_ROADMAP,
      BibleSection.MOODBOARD,
    ]

    for (const section of arraySections) {
      expect(SECTION_REGISTRY[section].merge).toBe(MergeStrategy.Replace)
    }
    for (const section of objectSections) {
      expect(SECTION_REGISTRY[section].merge).toBe(MergeStrategy.Deep)
    }
    expect(SECTION_REGISTRY[BibleSection.WORLD_DESCRIPTION].merge).toBe(MergeStrategy.Overwrite)
    expect(WORLD_BIBLE_SECTIONS).toHaveLength(
      arraySections.length + objectSections.length + 1,
    )
  })
})
