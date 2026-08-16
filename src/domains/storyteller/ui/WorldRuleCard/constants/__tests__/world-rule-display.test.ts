import { describe, expect, it } from 'vitest'
import {
  resolveWorldRuleCategoryStyle,
  WORLD_RULE_CATEGORY_DEFAULT,
  WORLD_RULE_CATEGORY_MATCHES,
} from '../world-rule-display'

describe('resolveWorldRuleCategoryStyle', () => {
  it('matches a known category keyword', () => {
    const magic = WORLD_RULE_CATEGORY_MATCHES[0]
    expect(magic).toBeDefined()
    if (!magic) return
    expect(resolveWorldRuleCategoryStyle('Magic')).toEqual({
      color: magic.color,
      bg: magic.bg,
      matchIndex: 0,
    })
  })

  it('falls back when the category is unknown', () => {
    expect(resolveWorldRuleCategoryStyle('Unknown')).toEqual({
      ...WORLD_RULE_CATEGORY_DEFAULT,
      matchIndex: -1,
    })
  })
})
