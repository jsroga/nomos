import { describe, expect, it } from 'vitest'
import { StorytellerOverrideState } from '@/domains/storyteller/core/storyteller-page-wire'
import { computeHasBible } from '@/domains/storyteller/state/utils/storyteller-has-bible'

describe('computeHasBible', () => {
  it('is false for an empty plan', () => {
    expect(computeHasBible({}, null)).toBe(false)
    expect(computeHasBible({ worldRules: [] }, null)).toBe(false)
  })

  it('is true when world rules exist even without description or genre', () => {
    expect(
      computeHasBible(
        {
          worldRules: [
            {
              category: 'Society',
              name: 'Corp Law',
              rule: 'Megacorps are above the law in the city-state.',
              consequence: 'Every crime ends in a bought verdict or a back-alley reckoning.',
            },
          ],
        },
        null,
      ),
    ).toBe(true)
  })

  it('is true for world description', () => {
    expect(computeHasBible({ worldDescription: 'A rain-soaked city-state.' }, null)).toBe(true)
  })

  it('honors override state', () => {
    expect(
      computeHasBible(
        {
          worldRules: [
            {
              category: 'Society',
              name: 'Corp Law',
              rule: 'Megacorps are above the law in the city-state.',
              consequence: 'Every crime ends in a bought verdict or a back-alley reckoning.',
            },
          ],
        },
        StorytellerOverrideState.NoBible,
      ),
    ).toBe(false)
    expect(computeHasBible({}, StorytellerOverrideState.NoEpisodes)).toBe(true)
  })
})
