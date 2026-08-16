import { describe, expect, it } from 'vitest'
import {
  WorldRuleCategory,
  worldRuleForDisplay,
  worldRuleTileCopy,
} from '../world-rule-wire'

describe('worldRuleForDisplay', () => {
  it('shows a tool-written rule that has no category', () => {
    const display = worldRuleForDisplay({
      rule: 'Names written in the ledger age backward.',
      consequence: 'The named person vanishes at dawn.',
    })

    expect(display?.rule).toBe('Names written in the ledger age backward.')
    expect(display?.category).toBe(WorldRuleCategory.SOCIETY)
  })

  it('keeps a valid category when the model sent one', () => {
    const display = worldRuleForDisplay({
      category: WorldRuleCategory.MAGIC,
      rule: 'A true name spoken thrice binds the speaker.',
      consequence: 'The speaker cannot leave the marsh.',
    })

    expect(display?.category).toBe(WorldRuleCategory.MAGIC)
  })

  it('returns null when there is no rule text', () => {
    expect(worldRuleForDisplay({})).toBeNull()
    expect(worldRuleForDisplay('')).toBeNull()
  })
})

describe('worldRuleTileCopy', () => {
  it('uses a short name and keeps the law in the description', () => {
    expect(
      worldRuleTileCopy({
        category: WorldRuleCategory.SOCIETY,
        name: 'The Wound Tax',
        rule: 'When someone is wounded they owe a year.',
        consequence: 'Collectors come at dusk.',
      })
    ).toEqual({
      title: 'The Wound Tax',
      description: 'When someone is wounded they owe a year.',
    })
  })

  it('splits an em-dash title out of a legacy rule field', () => {
    expect(
      worldRuleTileCopy({
        category: WorldRuleCategory.SOCIETY,
        name: '',
        rule: 'The Gravity of Grief — When someone is consumed by mourning, the street sinks.',
        consequence: 'Whole blocks vanish.',
      })
    ).toEqual({
      title: 'The Gravity of Grief',
      description: 'When someone is consumed by mourning, the street sinks.',
    })
  })
})
