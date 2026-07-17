import type { ArchetypeId, ArchetypeMatch } from './best-match-types'

interface ArchetypeIndicator {
  term: string
  weight: number
  pattern: string
}

export interface ArchetypeDefinition {
  id: ArchetypeId
  name: string
  description: string
  strongIndicators: ArchetypeIndicator[]
  weakIndicators: ArchetypeIndicator[]
  corePatterns: string[]
  antiPatterns: string[]
  marketSegment: string
}

function scoreIndicators(
  indicators: ArchetypeIndicator[],
  allText: string,
): { score: number; patterns: string[] } {
  const initial: { score: number; patterns: string[] } = { score: 0, patterns: [] }

  return indicators.reduce((result, indicator) => {
    if (!allText.includes(indicator.term)) {
      return result
    }

    result.score += indicator.weight
    result.patterns.push(indicator.pattern)
    return result
  }, initial)
}

function scoreMechanicBonus(
  archetypeId: ArchetypeId,
  mechanicTypes: string[],
  mechanicNames: string[],
): { score: number; patterns: string[] } {
  const hasType = (type: string) => mechanicTypes.includes(type)
  const hasName = (fragment: string) => mechanicNames.some(name => name.includes(fragment))

  if (archetypeId === 'vampire_survivors') {
    const patterns: string[] = []
    let score = 0

    if (hasType('reward') || hasName('reward')) {
      score += 5
      patterns.push('Reward mechanics present')
    }

    if (hasType('progression') || hasName('upgrade')) {
      score += 4
      patterns.push('Progression mechanics present')
    }

    return { score, patterns }
  }

  if (archetypeId === 'disco_elysium') {
    const patterns: string[] = []
    let score = 0

    if (hasType('narrative') || hasName('story')) {
      score += 5
      patterns.push('Narrative mechanics present')
    }

    if (hasType('choice') || hasName('choice')) {
      score += 4
      patterns.push('Choice mechanics present')
    }

    return { score, patterns }
  }

  const patterns: string[] = []
  let score = 0

  if (hasType('competitive') || hasName('rank')) {
    score += 5
    patterns.push('Competitive mechanics present')
  }

  if (hasType('team') || hasName('team')) {
    score += 4
    patterns.push('Team mechanics present')
  }

  return { score, patterns }
}

function findWeakPatterns(corePatterns: string[], allText: string): string[] {
  return corePatterns
    .filter(pattern => {
      const keywords = pattern.toLowerCase().split(/\s+/)
      return !keywords.some(keyword => keyword.length > 3 && allText.includes(keyword))
    })
    .slice(0, 3)
}

function buildInterpretation(name: string, normalizedScore: number): string {
  if (normalizedScore >= 70) {
    return `Strong ${name} alignment. Design hits core patterns that made ${name} successful.`
  }

  if (normalizedScore >= 45) {
    return `Moderate ${name} elements. Could appeal to ${name} fans with enhancements.`
  }

  if (normalizedScore >= 25) {
    return `Light ${name} overlap. Design has different focus - this is valid.`
  }

  return `Minimal ${name} similarity. Compare against different archetypes.`
}

function buildMarketImplication(
  name: string,
  marketSegment: string,
  normalizedScore: number,
): string {
  if (normalizedScore >= 70) {
    return `Position in ${marketSegment}. Clear target audience.`
  }

  if (normalizedScore >= 45) {
    return `Could capture ${name}-adjacent audience with targeted improvements.`
  }

  return 'Look to other archetypes for primary market positioning.'
}

export function scoreArchetype(
  archetype: ArchetypeDefinition,
  allText: string,
  mechanics: Array<{ name: string; type: string; description?: string }>,
): ArchetypeMatch {
  const strong = scoreIndicators(archetype.strongIndicators, allText)
  const weak = scoreIndicators(archetype.weakIndicators, allText)
  const mechanicTypes = mechanics.map(mechanic => mechanic.type?.toLowerCase() || '')
  const mechanicNames = mechanics.map(mechanic => mechanic.name.toLowerCase())
  const mechanicBonus = scoreMechanicBonus(archetype.id, mechanicTypes, mechanicNames)

  const rawScore = strong.score + weak.score + mechanicBonus.score
  const matchedPatterns = [...strong.patterns, ...mechanicBonus.patterns]
  const maxPossibleScore = archetype.strongIndicators.reduce((sum, indicator) => sum + indicator.weight, 0) + 14
  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round((rawScore / maxPossibleScore) * 100)),
  )

  const confidence = Math.min(
    1,
    matchedPatterns.length / Math.max(1, archetype.strongIndicators.length * 0.4),
  )

  return {
    archetype: archetype.id,
    archetypeName: archetype.name,
    score: normalizedScore,
    confidence,
    keyPatterns: matchedPatterns.slice(0, 8),
    weakPatterns: findWeakPatterns(archetype.corePatterns, allText),
    interpretation: buildInterpretation(archetype.name, normalizedScore),
    marketImplication: buildMarketImplication(
      archetype.name,
      archetype.marketSegment,
      normalizedScore,
    ),
  }
}

export const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'vampire_survivors',
    name: 'Vampire Survivors',
    description: 'Action roguelike with dopamine loops, auto-combat, power fantasy',
    strongIndicators: [
      { term: 'auto', weight: 8, pattern: 'Auto-attack/auto-fire mechanics' },
      { term: 'xp', weight: 7, pattern: 'XP collection system' },
      { term: 'gem', weight: 6, pattern: 'Gem/collectible drops' },
      { term: 'level up', weight: 7, pattern: 'Frequent level-ups' },
      { term: 'upgrade', weight: 6, pattern: 'Upgrade systems' },
      { term: 'evolution', weight: 8, pattern: 'Weapon evolution' },
      { term: 'wave', weight: 5, pattern: 'Wave-based enemies' },
      { term: 'survive', weight: 6, pattern: 'Survival objective' },
      { term: 'roguelike', weight: 7, pattern: 'Roguelike structure' },
      { term: 'run', weight: 5, pattern: 'Run-based gameplay' },
      { term: 'unlock', weight: 5, pattern: 'Unlock meta-progression' },
      { term: 'synergy', weight: 6, pattern: 'Build synergies' },
      { term: 'power', weight: 4, pattern: 'Power scaling' },
      { term: 'dopamine', weight: 7, pattern: 'Dopamine-driven design' },
    ],
    weakIndicators: [
      { term: 'aim', weight: -4, pattern: 'Manual aiming (reduces VS accessibility)' },
      { term: 'story', weight: -2, pattern: 'Story focus (VS is mechanics-first)' },
      { term: 'dialogue', weight: -3, pattern: 'Dialogue systems' },
      { term: 'competitive', weight: -3, pattern: 'Competitive focus' },
      { term: 'team', weight: -2, pattern: 'Team mechanics' },
    ],
    corePatterns: [
      'Constant micro-rewards (XP gems every second)',
      'Auto-attack reduces cognitive load',
      'Power fantasy through exponential scaling',
      '30-minute sessions with clear end',
      'Unlock-driven "one more run" hook',
    ],
    antiPatterns: [
      'Manual aiming requirement',
      'Complex input combos',
      'Narrative interruptions',
      'PvP competition',
    ],
    marketSegment: 'Casual action roguelike (fast-growing, proven market)',
  },
  {
    id: 'disco_elysium',
    name: 'Disco Elysium',
    description: 'Narrative RPG with deep choices, dialogue as gameplay, thematic depth',
    strongIndicators: [
      { term: 'dialogue', weight: 8, pattern: 'Dialogue-driven gameplay' },
      { term: 'narrative', weight: 7, pattern: 'Narrative architecture' },
      { term: 'story', weight: 6, pattern: 'Story focus' },
      { term: 'choice', weight: 8, pattern: 'Meaningful choices' },
      { term: 'consequence', weight: 7, pattern: 'Choice consequences' },
      { term: 'branch', weight: 6, pattern: 'Branching narrative' },
      { term: 'skill', weight: 5, pattern: 'Skill checks' },
      { term: 'character', weight: 5, pattern: 'Character depth' },
      { term: 'rpg', weight: 6, pattern: 'RPG systems' },
      { term: 'personality', weight: 6, pattern: 'Personality traits' },
      { term: 'thought', weight: 7, pattern: 'Internal thought system' },
      { term: 'philosophy', weight: 5, pattern: 'Philosophical themes' },
      { term: 'investigation', weight: 5, pattern: 'Investigation mechanics' },
    ],
    weakIndicators: [
      { term: 'combat', weight: -4, pattern: 'Combat-focused (DE has minimal combat)' },
      { term: 'action', weight: -3, pattern: 'Action gameplay' },
      { term: 'auto', weight: -2, pattern: 'Auto mechanics' },
      { term: 'competitive', weight: -4, pattern: 'Competitive elements' },
      { term: 'wave', weight: -3, pattern: 'Wave-based action' },
    ],
    corePatterns: [
      'Dialogue as primary gameplay mechanic',
      'Skills with personality (internal voices)',
      'Failure as valid narrative outcome',
      'Thematic depth over power fantasy',
      'Player identity exploration',
    ],
    antiPatterns: ['Twitch-based gameplay', 'PvP competition', 'Grinding loops', 'Power scaling'],
    marketSegment: 'Narrative RPG (niche but passionate audience)',
  },
  {
    id: 'counter_strike',
    name: 'Counter-Strike',
    description: 'Competitive tactical shooter with skill expression, economy, team play',
    strongIndicators: [
      { term: 'aim', weight: 8, pattern: 'Aim-based skill expression' },
      { term: 'competitive', weight: 7, pattern: 'Competitive focus' },
      { term: 'team', weight: 7, pattern: 'Team coordination' },
      { term: 'round', weight: 6, pattern: 'Round-based structure' },
      { term: 'economy', weight: 8, pattern: 'Economy meta-game' },
      { term: 'buy', weight: 5, pattern: 'Buy phase' },
      { term: 'rank', weight: 6, pattern: 'Ranking system' },
      { term: 'skill', weight: 5, pattern: 'Skill ceiling' },
      { term: 'headshot', weight: 7, pattern: 'Headshot mechanics' },
      { term: 'tactical', weight: 6, pattern: 'Tactical gameplay' },
      { term: 'bomb', weight: 6, pattern: 'Objective modes' },
      { term: 'pvp', weight: 5, pattern: 'PvP core' },
      { term: 'esport', weight: 6, pattern: 'Esports ready' },
      { term: 'multiplayer', weight: 5, pattern: 'Multiplayer core' },
    ],
    weakIndicators: [
      { term: 'story', weight: -3, pattern: 'Story focus (CS is mechanics-first)' },
      { term: 'single player', weight: -5, pattern: 'Single-player (CS is multiplayer)' },
      { term: 'singleplayer', weight: -5, pattern: 'Single-player' },
      { term: 'casual', weight: -2, pattern: 'Casual focus' },
      { term: 'auto', weight: -4, pattern: 'Auto mechanics (skill reduction)' },
      { term: 'random', weight: -4, pattern: 'RNG elements (anti-skill)' },
    ],
    corePatterns: [
      'Raw skill determines outcomes',
      'Economy persists across rounds',
      'Team coordination required for success',
      'Death is meaningful (no respawn)',
      'Ranked progression drives engagement',
    ],
    antiPatterns: [
      'Heavy RNG/luck',
      'Auto-aim/auto-attack',
      'Solo-focused design',
      'Narrative interruptions',
    ],
    marketSegment: 'Competitive shooter (massive market, high barrier)',
  },
]
