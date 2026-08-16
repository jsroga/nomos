/** World rule card category keyword matching and Tailwind display classes. */

export interface WorldRuleCategoryMatch {
  keywords: string[]
  color: string
  bg: string
}

export const WORLD_RULE_CATEGORY_MATCHES: WorldRuleCategoryMatch[] = [
  {
    keywords: ['magic', 'metaphysics', 'gnostic'],
    color: 'text-violet-300',
    bg: 'bg-violet-500/15 border-violet-500/20',
  },
  {
    keywords: ['politic', 'visitor'],
    color: 'text-amber-300',
    bg: 'bg-amber-500/15 border-amber-500/20',
  },
  {
    keywords: ['tech'],
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/15 border-cyan-500/20',
  },
  {
    keywords: ['society', 'control'],
    color: 'text-rose-300',
    bg: 'bg-rose-500/15 border-rose-500/20',
  },
  {
    keywords: ['ufo', 'perception'],
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/15 border-emerald-500/20',
  },
  {
    keywords: ['physic', 'cost'],
    color: 'text-blue-300',
    bg: 'bg-blue-500/15 border-blue-500/20',
  },
]

export const WORLD_RULE_CATEGORY_DEFAULT = {
  color: 'text-purple-300',
  bg: 'bg-purple-500/15 border-purple-500/20',
}

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
