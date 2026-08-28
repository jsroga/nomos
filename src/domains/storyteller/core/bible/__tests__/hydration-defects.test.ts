/**
 * The three defects SPEC-11 Task 3a found: fields the bible owns, that a panel
 * reads off plan state, and that no hydration path ever carried there.
 *
 * Each is the plot-twist bug with a different section's name. Asserted through
 * the real hydration entry point rather than by checking list membership, so a
 * future change that keeps the field listed but stops it flowing still fails.
 */
import { describe, expect, it } from 'vitest'
import { hydratePlanFromBibleSources } from '@/domains/storyteller/state/utils/hydrate-plan-from-bible'

const ITEM = { name: 'The Ledger', description: 'It records every debt.' }
const EVENT = { name: 'The Stillness', description: 'Every clock stopped.' }
const MOOD = 'Low strings under tape hiss'

describe('fields a panel reads must reach plan state', () => {
  it('hydrates items — BibleItems.tsx reads storyPlan.items', () => {
    const plan = hydratePlanFromBibleSources({ items: [ITEM] }, {})

    expect(plan.items).toEqual([ITEM])
  })

  it('hydrates events — BibleEvents.tsx reads storyPlan.events', () => {
    const plan = hydratePlanFromBibleSources({ events: [EVENT] }, {})

    expect(plan.events).toEqual([EVENT])
  })

  it('hydrates moodSoundtrack — BibleSoundtracks.tsx reads storyPlan.moodSoundtrack', () => {
    const plan = hydratePlanFromBibleSources({ moodSoundtrack: MOOD }, {})

    expect(plan.moodSoundtrack).toBe(MOOD)
  })

  it('does not overwrite a value the story plan already has', () => {
    const plan = hydratePlanFromBibleSources({ items: [ITEM] }, { items: [{ name: 'Kept' }] })

    expect(plan.items).toEqual([{ name: 'Kept' }])
  })

  it('leaves the field absent when the bible has nothing to give', () => {
    const plan = hydratePlanFromBibleSources({}, {})

    expect(plan.items).toBeUndefined()
    expect(plan.events).toBeUndefined()
    expect(plan.moodSoundtrack).toBeUndefined()
  })
})
