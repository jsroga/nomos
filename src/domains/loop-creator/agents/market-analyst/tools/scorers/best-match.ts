/**
 * Best Match Archetype Scorer
 *
 * KEY DESIGN PRINCIPLE: A loop only needs to excel at ONE archetype to be viable.
 * This tool runs all three reference game scorers and identifies the strongest match.
 *
 * A score of 70+ on ANY reference game = green light
 *
 * The output provides:
 * - Primary archetype with confidence score
 * - Key patterns that matched
 * - Secondary archetypes for reference (but not required to score well)
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Archetype identifiers
 */
export type ArchetypeId = 'disco_elysium' | 'vampire_survivors' | 'counter_strike'

/**
 * Result from matching against an archetype
 */
export interface ArchetypeMatch {
  archetype: ArchetypeId
  archetypeName: string
  score: number // 0-100 raw score
  confidence: number // 0-1 how confident this is THE match
  keyPatterns: string[] // Patterns that matched strongly
  weakPatterns: string[] // Where it diverges (not necessarily bad)
  interpretation: string // Expert interpretation
  marketImplication: string // What this means for market positioning
}

/**
 * Best match analysis result
 */
export interface BestMatchResult {
  success: boolean
  primaryArchetype: ArchetypeMatch
  otherArchetypes: ArchetypeMatch[]
  viabilityVerdict: 'strong' | 'moderate' | 'niche' | 'unclear'
  viabilityReason: string
  recommendation: string
}

/**
 * Archetype definitions with scoring patterns
 */
interface ArchetypeDefinition {
  id: ArchetypeId
  name: string
  description: string
  strongIndicators: Array<{ term: string; weight: number; pattern: string }>
  weakIndicators: Array<{ term: string; weight: number; pattern: string }>
  corePatterns: string[]
  antiPatterns: string[]
  marketSegment: string
}

const ARCHETYPES: ArchetypeDefinition[] = [
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

/**
 * Score a design against an archetype
 */
function scoreArchetype(
  archetype: ArchetypeDefinition,
  allText: string,
  mechanics: Array<{ name: string; type: string; description?: string }>
): ArchetypeMatch {
  let rawScore = 0
  const matchedPatterns: string[] = []
  const missedPatterns: string[] = []

  // Score strong indicators
  for (const indicator of archetype.strongIndicators) {
    if (allText.includes(indicator.term)) {
      rawScore += indicator.weight
      matchedPatterns.push(indicator.pattern)
    }
  }

  // Apply weak indicator penalties
  for (const indicator of archetype.weakIndicators) {
    if (allText.includes(indicator.term)) {
      rawScore += indicator.weight // negative weights
      missedPatterns.push(indicator.pattern)
    }
  }

  // Check mechanic types for additional scoring
  const mechanicTypes = mechanics.map(m => m.type?.toLowerCase() || '')
  const mechanicNames = mechanics.map(m => m.name.toLowerCase())

  // Bonus for archetype-specific mechanic types
  if (archetype.id === 'vampire_survivors') {
    if (mechanicTypes.includes('reward') || mechanicNames.some(n => n.includes('reward'))) {
      rawScore += 5
      matchedPatterns.push('Reward mechanics present')
    }
    if (mechanicTypes.includes('progression') || mechanicNames.some(n => n.includes('upgrade'))) {
      rawScore += 4
      matchedPatterns.push('Progression mechanics present')
    }
  } else if (archetype.id === 'disco_elysium') {
    if (mechanicTypes.includes('narrative') || mechanicNames.some(n => n.includes('story'))) {
      rawScore += 5
      matchedPatterns.push('Narrative mechanics present')
    }
    if (mechanicTypes.includes('choice') || mechanicNames.some(n => n.includes('choice'))) {
      rawScore += 4
      matchedPatterns.push('Choice mechanics present')
    }
  } else if (archetype.id === 'counter_strike') {
    if (mechanicTypes.includes('competitive') || mechanicNames.some(n => n.includes('rank'))) {
      rawScore += 5
      matchedPatterns.push('Competitive mechanics present')
    }
    if (mechanicTypes.includes('team') || mechanicNames.some(n => n.includes('team'))) {
      rawScore += 4
      matchedPatterns.push('Team mechanics present')
    }
  }

  // Normalize score to 0-100
  const maxPossibleScore = archetype.strongIndicators.reduce((sum, i) => sum + i.weight, 0) + 14 // +14 for mechanic bonuses
  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round((rawScore / maxPossibleScore) * 100))
  )

  // Calculate confidence based on pattern matches
  const strongMatches = matchedPatterns.length
  const totalStrong = archetype.strongIndicators.length
  const confidence = Math.min(1, strongMatches / Math.max(1, totalStrong * 0.4)) // 40% match = 100% confidence

  // Identify weak patterns (core patterns not matched)
  const weakPatterns = archetype.corePatterns
    .filter(pattern => {
      const keywords = pattern.toLowerCase().split(/\s+/)
      return !keywords.some(kw => kw.length > 3 && allText.includes(kw))
    })
    .slice(0, 3)

  // Generate interpretation
  let interpretation: string
  if (normalizedScore >= 70) {
    interpretation = `Strong ${archetype.name} alignment. Design hits core patterns that made ${archetype.name} successful.`
  } else if (normalizedScore >= 45) {
    interpretation = `Moderate ${archetype.name} elements. Could appeal to ${archetype.name} fans with enhancements.`
  } else if (normalizedScore >= 25) {
    interpretation = `Light ${archetype.name} overlap. Design has different focus - this is valid.`
  } else {
    interpretation = `Minimal ${archetype.name} similarity. Compare against different archetypes.`
  }

  // Market implication
  let marketImplication: string
  if (normalizedScore >= 70) {
    marketImplication = `Position in ${archetype.marketSegment}. Clear target audience.`
  } else if (normalizedScore >= 45) {
    marketImplication = `Could capture ${archetype.name}-adjacent audience with targeted improvements.`
  } else {
    marketImplication = 'Look to other archetypes for primary market positioning.'
  }

  return {
    archetype: archetype.id,
    archetypeName: archetype.name,
    score: normalizedScore,
    confidence,
    keyPatterns: matchedPatterns.slice(0, 8),
    weakPatterns,
    interpretation,
    marketImplication,
  }
}

/**
 * Best Match Scorer Tool
 */
export const bestMatchScorerTool = new DynamicStructuredTool({
  name: 'best_match_archetype_scorer',
  description: `Analyze game design against three reference archetypes (Vampire Survivors, Disco Elysium, Counter-Strike) and identify the STRONGEST match.

KEY PRINCIPLE: A loop only needs to excel at ONE archetype to be viable.
- Score 70+ on ANY archetype = strong market fit
- Score 45-69 = moderate fit with improvement potential
- Below 45 = different focus (valid but needs different positioning)

Returns:
- Primary archetype with confidence and key patterns
- Other archetypes for reference
- Viability verdict (strong/moderate/niche/unclear)
- Market positioning recommendation`,
  schema: z.object({
    mechanics: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          description: z.string().optional(),
        })
      )
      .describe('Game mechanics to analyze'),
    loops: z
      .array(
        z.object({
          name: z.string(),
          type: z.string(),
          description: z.string().optional(),
        })
      )
      .optional()
      .describe('Game loops if defined'),
    gameDescription: z.string().optional().describe('Overall game description'),
    gameGenre: z.string().optional().describe('Target game genre'),
  }),
  func: async ({ mechanics, loops, gameDescription, gameGenre }): Promise<string> => {
    try {
      // Build analysis context
      const allText = [
        ...mechanics.map(m => `${m.name} ${m.type} ${m.description || ''}`),
        ...(loops || []).map(l => `${l.name} ${l.type} ${l.description || ''}`),
        gameDescription || '',
        gameGenre || '',
      ]
        .join(' ')
        .toLowerCase()

      // Score against all archetypes
      const archetypeMatches: ArchetypeMatch[] = ARCHETYPES.map(archetype =>
        scoreArchetype(archetype, allText, mechanics)
      )

      // Sort by score descending
      archetypeMatches.sort((a, b) => b.score - a.score)

      const primaryArchetype = archetypeMatches[0]
      const otherArchetypes = archetypeMatches.slice(1)

      // Determine viability verdict
      let viabilityVerdict: 'strong' | 'moderate' | 'niche' | 'unclear'
      let viabilityReason: string

      if (primaryArchetype.score >= 70) {
        viabilityVerdict = 'strong'
        viabilityReason = `Design strongly matches ${primaryArchetype.archetypeName} formula. Clear market fit with proven audience.`
      } else if (primaryArchetype.score >= 45) {
        viabilityVerdict = 'moderate'
        viabilityReason = `Design has ${primaryArchetype.archetypeName} elements but needs enhancement to fully capture that audience.`
      } else if (primaryArchetype.score >= 25) {
        viabilityVerdict = 'niche'
        viabilityReason =
          'Design doesn\'t strongly match any reference archetype. May need unique positioning or hybrid appeal.'
      } else {
        viabilityVerdict = 'unclear'
        viabilityReason =
          'Design needs more definition. Consider which archetype you want to target and add relevant patterns.'
      }

      // Generate recommendation
      let recommendation: string
      if (viabilityVerdict === 'strong') {
        recommendation = `Lean into ${primaryArchetype.archetypeName} strengths. Your key patterns: ${primaryArchetype.keyPatterns.slice(0, 3).join(', ')}. Study successful games in this space.`
      } else if (viabilityVerdict === 'moderate') {
        const topMissing = primaryArchetype.weakPatterns[0] || 'core patterns'
        recommendation = `To strengthen ${primaryArchetype.archetypeName} fit, consider adding: ${topMissing}. Or pivot toward ${otherArchetypes[0].archetypeName} if that fits your vision better.`
      } else {
        recommendation = `Define your target: Add ${primaryArchetype.keyPatterns.length > 0 ? primaryArchetype.archetypeName : 'clear'} mechanics, or create a unique hybrid. What player motivation do you serve?`
      }

      const result: BestMatchResult = {
        success: true,
        primaryArchetype,
        otherArchetypes,
        viabilityVerdict,
        viabilityReason,
        recommendation,
      }

      return JSON.stringify({
        ...result,

        // Summary for quick reference
        summary: {
          bestMatch: primaryArchetype.archetypeName,
          bestScore: primaryArchetype.score,
          verdict: viabilityVerdict,
          keyStrengths: primaryArchetype.keyPatterns.slice(0, 3),
        },

        // Comparison table
        scoreComparison: archetypeMatches.map(m => ({
          archetype: m.archetypeName,
          score: m.score,
          confidence: Math.round(m.confidence * 100),
          isPrimary: m === primaryArchetype,
        })),

        // Analysis metadata
        _analysis: {
          mechanicCount: mechanics.length,
          textLength: allText.length,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Best match analysis failed',
        primaryArchetype: null,
        otherArchetypes: [],
        viabilityVerdict: 'unclear',
        viabilityReason: 'Analysis failed',
        recommendation: 'Retry analysis',
      })
    }
  },
})
