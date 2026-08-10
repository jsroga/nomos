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

  it('keeps only inspirations for an inspirations turn', () => {
    const { updates, dropped } = filterUpdatesForBibleSection(
      {
        inspirations: { books: [{ title: 'Dune', description: 'Sand.' }] },
        moodSoundtrack: 'jazz',
        plotTwists: [{ title: 'Nope', description: 'No.' }],
      },
      BibleSection.INSPIRATIONS
    )
    expect(updates).toEqual({
      inspirations: { books: [{ title: 'Dune', description: 'Sand.' }] },
    })
    expect(dropped).toEqual(['moodSoundtrack', 'plotTwists'])
  })

  it('allows moodSoundtrack on soundtrack turns', () => {
    const { updates, dropped } = filterUpdatesForBibleSection(
      { moodSoundtrack: 'drone', worldDescription: 'overwrite me' },
      BibleSection.SOUNDTRACKS
    )
    expect(updates).toEqual({ moodSoundtrack: 'drone' })
    expect(dropped).toEqual(['worldDescription'])
  })

  it('allows episodePremise on premise turns', () => {
    const premise = { logline: 'A door opens.' }
    const { updates, dropped } = filterUpdatesForBibleSection(
      { episodePremise: premise, worldDescription: 'nope' },
      BibleSection.EPISODE_PREMISE
    )
    expect(updates).toEqual({ episodePremise: premise })
    expect(dropped).toEqual(['worldDescription'])
  })
})
