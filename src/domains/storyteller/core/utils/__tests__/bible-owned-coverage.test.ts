/**
 * Guards the data-integrity bug that kept coming back one section at a time.
 *
 * A world-level section missing from BIBLE_OWNED_PLAN_FIELDS gets written onto
 * `episodes.story_plan` instead of the bible, so the bible panel renders empty
 * until an episode is opened. Soundtracks and inspirations were fixed once by
 * hand, which left factions, plot twists and the roadmap broken. This test ties
 * the ownership list to the section list so the next section cannot be missed.
 */

import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  BIBLE_OWNED_PLAN_FIELDS,
  omitBibleOwnedPlanFields,
  pickBibleOwnedPlanFields,
} from '../bible-populated-fields'

/** Sections that legitimately live on an episode, not the bible. */
const EPISODE_OWNED_SECTIONS: string[] = [BibleSection.EPISODE_PREMISE]
/** Not a section — the catch-all bucket for unrecognised tool fields. */
const NON_SECTIONS: string[] = [BibleSection.FULL]

const WORLD_SECTIONS = Object.values(BibleSection).filter(
  section => !EPISODE_OWNED_SECTIONS.includes(section) && !NON_SECTIONS.includes(section)
)

const owned: string[] = [...BIBLE_OWNED_PLAN_FIELDS]

/** Sections whose "has content" test is shape-specific, not just non-empty. */
const SAMPLE_BY_SECTION: Record<string, unknown> = {
  [BibleSection.INSPIRATIONS]: { books: [{ title: 'Dune', description: 'd' }] },
  [BibleSection.WORLD_DESCRIPTION]: 'The Stillness stopped every clock.',
  [BibleSection.MOODBOARD]: { images: ['https://example.test/a.png'] },
  [BibleSection.EPISODE_ROADMAP]: { episodes: [{ title: 'One' }] },
}

function sampleFor(section: string): unknown {
  return SAMPLE_BY_SECTION[section] ?? [{ name: 'x', description: 'y' }]
}

function planWithEverySection(): Record<string, unknown> {
  const plan: Record<string, unknown> = { premise: { logline: 'episode only' } }
  for (const section of WORLD_SECTIONS) plan[section] = sampleFor(section)
  return plan
}

describe('bible-owned field coverage', () => {
  it.each(WORLD_SECTIONS)('%s is owned by the bible, not an episode', section => {
    expect(owned).toContain(section)
  })

  it('keeps episode-only sections off the bible', () => {
    for (const section of EPISODE_OWNED_SECTIONS) {
      expect(owned).not.toContain(section)
    }
  })

  it('strips every world section from an episode plan', () => {
    const episodePlan = omitBibleOwnedPlanFields(planWithEverySection())

    expect(episodePlan.premise).toEqual({ logline: 'episode only' })
    for (const section of WORLD_SECTIONS) {
      expect(episodePlan[section]).toBeUndefined()
    }
  })

  it('lifts every world section onto the bible', () => {
    const biblePlan = pickBibleOwnedPlanFields(planWithEverySection())

    expect(biblePlan.premise).toBeUndefined()
    for (const section of WORLD_SECTIONS) {
      expect(biblePlan[section]).toBeDefined()
    }
  })

  it('does not let an empty regenerate wipe a stored section', () => {
    const picked = pickBibleOwnedPlanFields({
      [BibleSection.PLOT_TWISTS]: [],
      [BibleSection.FACTIONS]: [{ name: 'The Tallybone', description: 'd' }],
    })
    expect(picked[BibleSection.PLOT_TWISTS]).toBeUndefined()
    expect(picked[BibleSection.FACTIONS]).toBeDefined()
  })
})
