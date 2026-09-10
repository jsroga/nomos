export {
  WORLD_RULE_CATEGORY_DEFAULT,
  WORLD_RULE_CATEGORY_MATCHES,
  type WorldRuleCategoryMatch,
} from '../constants/world-rule-display'
import {
  WORLD_RULE_CATEGORY_DEFAULT,
  WORLD_RULE_CATEGORY_MATCHES,
} from '../constants/world-rule-display'

export function resolveWorldRuleCategoryStyle(category: string): {
  color: string
  bg: string
  matchIndex: number
} {
  const categoryLower = category.toLowerCase()
  for (let index = 0; index < WORLD_RULE_CATEGORY_MATCHES.length; index++) {
    const match = WORLD_RULE_CATEGORY_MATCHES[index]
    if (match.keywords.some(keyword => categoryLower.includes(keyword))) {
      return { color: match.color, bg: match.bg, matchIndex: index }
    }
  }
  return { ...WORLD_RULE_CATEGORY_DEFAULT, matchIndex: -1 }
}
