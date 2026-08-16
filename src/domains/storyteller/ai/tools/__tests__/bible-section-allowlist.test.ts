import { describe, expect, it } from 'vitest'
import { filterUpdatesForBibleSection } from '../bible-section-allowlist'
import { BibleSection } from '@/domains/storyteller/core/types/enums'

describe('filterUpdatesForBibleSection', () => {
  it('passes all fields when no section is set', () => {
    const updates = { inspirations: { books: [] }, moodSoundtrack: 'x' }
    expect(filterUpdatesForBibleSection(updates, undefined)).toEqual({
      updates,
      dropped: [],
    })
  })

  it('keeps off-section fields so sibling panels can pending-review them', () => {
    const updates = {
      inspirations: { books: [{ title: 'Dune', description: 'Sand.' }] },
      moodSoundtrack: 'jazz',
      plotTwists: [{ title: 'Nope', description: 'No.' }],
    }
    const { updates: kept, dropped } = filterUpdatesForBibleSection(
      updates,
      BibleSection.INSPIRATIONS
    )
    expect(kept).toEqual(updates)
    expect(dropped).toEqual(['moodSoundtrack', 'plotTwists'])
  })

  it('allows moodSoundtrack on soundtrack turns and still reports extras', () => {
    const { updates, dropped } = filterUpdatesForBibleSection(
      { moodSoundtrack: 'drone', worldDescription: 'overwrite me' },
      BibleSection.SOUNDTRACKS
    )
    expect(updates).toEqual({ moodSoundtrack: 'drone', worldDescription: 'overwrite me' })
    expect(dropped).toEqual(['worldDescription'])
  })

  it('allows episodePremise on premise turns and still reports extras', () => {
    const premise = { logline: 'A door opens.' }
    const { updates, dropped } = filterUpdatesForBibleSection(
      { episodePremise: premise, worldDescription: 'nope' },
      BibleSection.EPISODE_PREMISE
    )
    expect(updates).toEqual({ episodePremise: premise, worldDescription: 'nope' })
    expect(dropped).toEqual(['worldDescription'])
  })
})
