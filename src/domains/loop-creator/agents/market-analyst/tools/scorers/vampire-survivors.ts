/**
 * Vampire Survivors Scorer Tool
 *
 * Scores the loop design against action/survivors-like criteria.
 *
 * SECRET SAUCE: Expert analysis of the Vampire Survivors formula:
 * - Dopamine loop design (constant micro-rewards)
 * - Input reduction (accessibility through simplicity)
 * - Power fantasy escalation
 * - Session architecture
 * - Content revelation systems
 *
 * This is a HIDDEN score - used for internal analysis.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

interface DesignAnalysis {
  mechanics: Array<{ name: string; type: string; description?: string }>
  loops?: Array<{ name: string; type: string; description?: string }>
  gameDescription?: string
  allText: string
  mechanicTypes: Set<string>
  mechanicCount: number
}

interface ScoringDimension {
  name: string
  weight: number
  maxPoints: number
  description: string
  scoringLogic: (analysis: DesignAnalysis) => { score: number; notes: string[] }
}

/**
 * Expert-calibrated Vampire Survivors scoring dimensions
 */
const SCORING_DIMENSIONS: ScoringDimension[] = [
  {
    name: 'Dopamine Loop Design',
    weight: 0.25,
    maxPoints: 25,
    description: 'Constant micro-rewards creating addictive feedback rhythm',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Core reward indicators
      const rewardIndicators = [
        { term: 'reward', points: 4, note: 'Reward system' },
        { term: 'xp', points: 5, note: 'XP collection mechanic' },
        { term: 'gem', points: 5, note: 'Gem/collectible drops' },
        { term: 'level up', points: 5, note: 'Level up system' },
        { term: 'levelup', points: 5, note: 'Level up system' },
        { term: 'drop', points: 3, note: 'Item drops' },
        { term: 'pickup', points: 4, note: 'Pickup mechanics' },
        { term: 'collect', points: 3, note: 'Collection mechanics' },
        { term: 'feedback', points: 3, note: 'Feedback systems' },
        { term: 'juice', points: 4, note: 'Juicy feedback' },
      ]

      for (const indicator of rewardIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Frequency bonus: Multiple reward types
      const rewardMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('reward') ||
          m.name.toLowerCase().includes('reward') ||
          m.name.toLowerCase().includes('collect')
      )
      if (rewardMechanics.length >= 2) {
        score += 4
        notes.push('Multiple layered reward systems')
      }

      // VS special: Constant drops
      if (
        analysis.allText.includes('constant') ||
        analysis.allText.includes('frequent') ||
        analysis.allText.includes('continuous')
      ) {
        score += 3
        notes.push('High frequency reward pacing')
      }

      return { score: Math.min(25, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Input Simplicity',
    weight: 0.2,
    maxPoints: 20,
    description: 'Reduced input complexity for maximum accessibility',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Simplicity indicators
      const simplicityIndicators = [
        { term: 'auto', points: 6, note: 'Auto mechanics (VS signature)' },
        { term: 'automatic', points: 6, note: 'Automatic actions' },
        { term: 'simple', points: 3, note: 'Simple controls' },
        { term: 'easy', points: 2, note: 'Easy to learn' },
        { term: 'one button', points: 5, note: 'One-button gameplay' },
        { term: 'onebutton', points: 5, note: 'One-button gameplay' },
        { term: 'casual', points: 3, note: 'Casual friendly' },
        { term: 'movement', points: 4, note: 'Movement-focused input' },
      ]

      for (const indicator of simplicityIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Complexity penalties
      const complexityIndicators = [
        { term: 'aim', points: -3, note: 'Aiming required (reduces accessibility)' },
        { term: 'combo', points: -2, note: 'Combo inputs' },
        { term: 'timing', points: -2, note: 'Timing-based input' },
        { term: 'precision', points: -2, note: 'Precision required' },
        { term: 'complex', points: -3, note: 'Complex mechanics' },
      ]

      for (const indicator of complexityIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Base score for games without explicit complexity
      if (score === 0 && !analysis.allText.includes('difficult')) {
        score = 8
        notes.push('Neutral input complexity')
      }

      return { score: Math.min(20, Math.max(0, score + 10)), notes }
    },
  },
  {
    name: 'Power Fantasy Escalation',
    weight: 0.25,
    maxPoints: 25,
    description: 'Player becomes increasingly powerful throughout session',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Power scaling indicators
      const powerIndicators = [
        { term: 'power', points: 4, note: 'Power mechanics' },
        { term: 'scale', points: 4, note: 'Scaling systems' },
        { term: 'upgrade', points: 5, note: 'Upgrade systems' },
        { term: 'evolution', points: 5, note: 'Evolution mechanics (VS signature)' },
        { term: 'evolve', points: 5, note: 'Evolution mechanics' },
        { term: 'strong', points: 2, note: 'Strength growth' },
        { term: 'weapon', points: 3, note: 'Weapon variety' },
        { term: 'passive', points: 3, note: 'Passive abilities' },
        { term: 'synergy', points: 5, note: 'Synergy systems (VS depth)' },
        { term: 'build', points: 4, note: 'Build variety' },
        { term: 'overpowered', points: 3, note: 'Intentional OP moments' },
      ]

      for (const indicator of powerIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // VS special: Multiplicative power
      if (
        analysis.allText.includes('multiply') ||
        analysis.allText.includes('exponential') ||
        analysis.allText.includes('stack')
      ) {
        score += 4
        notes.push('Multiplicative power scaling (VS formula)')
      }

      // Check for progression mechanics
      const progressionMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('progression') ||
          m.type?.toLowerCase().includes('upgrade') ||
          m.name.toLowerCase().includes('evolv')
      )
      if (progressionMechanics.length >= 2) {
        score += 3
        notes.push('Multiple progression systems')
      }

      return { score: Math.min(25, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Session Architecture',
    weight: 0.15,
    maxPoints: 15,
    description: 'Clear session boundaries with appropriate length',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Session structure indicators
      const sessionIndicators = [
        { term: 'run', points: 5, note: 'Run-based structure' },
        { term: 'session', points: 4, note: 'Session design' },
        { term: 'wave', points: 4, note: 'Wave-based progression' },
        { term: 'round', points: 3, note: 'Round structure' },
        { term: 'timer', points: 3, note: 'Timer-based sessions' },
        { term: 'survive', points: 4, note: 'Survival objective' },
        { term: '30 min', points: 5, note: 'VS-style session length' },
        { term: '15 min', points: 4, note: 'Short session design' },
      ]

      for (const indicator of sessionIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // VS special: Natural session end
      if (analysis.allText.includes('death') || analysis.allText.includes('game over')) {
        score += 3
        notes.push('Clear session end condition')
      }

      // Penalty for indefinite play
      if (analysis.allText.includes('endless') && !analysis.allText.includes('wave')) {
        score -= 3
        notes.push('Endless design may lack session boundaries')
      }

      return { score: Math.min(15, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Content Revelation',
    weight: 0.15,
    maxPoints: 15,
    description: 'Unlock systems creating "one more run" motivation',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Unlock indicators
      const unlockIndicators = [
        { term: 'unlock', points: 5, note: 'Unlock systems' },
        { term: 'achievement', points: 3, note: 'Achievement system' },
        { term: 'character', points: 4, note: 'Character unlocks' },
        { term: 'meta', points: 4, note: 'Meta progression' },
        { term: 'permanent', points: 4, note: 'Permanent progression' },
        { term: 'discover', points: 3, note: 'Discovery mechanics' },
        { term: 'secret', points: 3, note: 'Secret content' },
        { term: 'hidden', points: 2, note: 'Hidden content' },
      ]

      for (const indicator of unlockIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // VS special: Progressive content revelation
      if (analysis.allText.includes('unlock') && analysis.allText.includes('run')) {
        score += 3
        notes.push('Run-unlock loop (VS core hook)')
      }

      // Check for meta mechanics
      const metaMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('meta') ||
          m.name.toLowerCase().includes('unlock') ||
          m.name.toLowerCase().includes('permanent')
      )
      if (metaMechanics.length > 0) {
        score += 2
        notes.push('Dedicated meta-progression mechanics')
      }

      return { score: Math.min(15, Math.max(0, score)), notes }
    },
  },
]

/**
 * Reference scores for calibration
 */
const REFERENCE_SCORES = {
  'Vampire Survivors': { score: 95, notes: 'Genre-defining, perfect score' },
  Balatro: { score: 88, notes: 'Roguelike deckbuilder breakout hit, run-based structure' },
  'Risk of Rain 2': { score: 75, notes: 'Co-op power fantasy, longer sessions' },
  Hades: { score: 58, notes: 'More complex input, narrative focus' },
  'Slay the Spire': { score: 45, notes: 'Strategic, not action-focused' },
  'Disco Elysium': { score: 5, notes: 'No action elements' },
  'Counter-Strike': { score: 25, notes: 'Skill-focused, no power fantasy' },
}

/** Input schema for Vampire Survivors scorer (extracted to avoid deep type instantiation). */
const vampireSurvivorsScorerSchema = z.object({
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
})

/**
 * Vampire Survivors scorer tool
 */
export const vampireSurvivorsScorerTool = new DynamicStructuredTool({
  name: 'vampire_survivors_scorer',
  description: `Score the game design against Vampire Survivors-style action criteria.
Evaluates:
- Dopamine Loop Design (25%): Constant micro-rewards, XP gems, level-ups
- Input Simplicity (20%): Auto-attack, reduced controls, accessibility
- Power Fantasy Escalation (25%): Upgrades, evolution, synergies
- Session Architecture (15%): Run length, clear boundaries, survival
- Content Revelation (15%): Unlocks, meta-progression, "one more run"

Returns 0-100 score with detailed breakdown. High scores indicate strong VS-like appeal.`,
  schema: vampireSurvivorsScorerSchema,
  func: async ({ mechanics, loops, gameDescription }): Promise<string> => {
    try {
      // Build analysis context
      const allText = [
        ...mechanics.map(m => `${m.name} ${m.type} ${m.description || ''}`),
        ...(loops || []).map(l => `${l.name} ${l.type} ${l.description || ''}`),
        gameDescription || '',
      ]
        .join(' ')
        .toLowerCase()

      const mechanicTypes = new Set(mechanics.map(m => m.type?.toLowerCase() || 'unknown'))

      const analysis: DesignAnalysis = {
        mechanics,
        loops,
        gameDescription,
        allText,
        mechanicTypes,
        mechanicCount: mechanics.length,
      }

      // Score each dimension
      const dimensionScores: Record<
        string,
        {
          score: number
          maxScore: number
          weight: number
          notes: string[]
          description: string
        }
      > = {}

      let totalWeightedScore = 0

      for (const dimension of SCORING_DIMENSIONS) {
        const result = dimension.scoringLogic(analysis)
        dimensionScores[dimension.name] = {
          score: result.score,
          maxScore: dimension.maxPoints,
          weight: dimension.weight,
          notes: result.notes,
          description: dimension.description,
        }
        totalWeightedScore += (result.score / dimension.maxPoints) * dimension.weight * 100
      }

      const finalScore = Math.round(totalWeightedScore)

      // Generate expert insights
      const insights: string[] = []

      const dopamineScore = dimensionScores['Dopamine Loop Design'].score
      const inputScore = dimensionScores['Input Simplicity'].score
      const powerScore = dimensionScores['Power Fantasy Escalation'].score
      const sessionScore = dimensionScores['Session Architecture'].score
      const unlockScore = dimensionScores['Content Revelation'].score

      if (dopamineScore >= 15 && inputScore >= 12) {
        insights.push('✅ Core VS formula present: Low friction + high reward frequency')
      }

      if (powerScore >= 15) {
        insights.push('✅ Strong power fantasy - players will feel increasingly powerful')
      } else if (powerScore < 8) {
        insights.push('⚠️ Limited power scaling - consider upgrade/evolution systems')
      }

      if (inputScore >= 15) {
        insights.push('✨ Accessible design - wide audience appeal like VS')
      } else if (inputScore < 8) {
        insights.push('⚠️ Higher input complexity limits accessibility')
      }

      if (unlockScore >= 10 && sessionScore >= 8) {
        insights.push('🎯 "One more run" hook likely strong')
      }

      if (finalScore >= 70) {
        insights.push('🎮 Strong VS-like appeal - target action/casual crossover audience')
      } else if (finalScore >= 45) {
        insights.push('💡 Some VS elements but different focus - identify unique value')
      } else if (finalScore < 30) {
        insights.push('📊 Different genre approach - VS comparison less relevant')
      }

      // Specific recommendations
      const recommendations: string[] = []

      if (dopamineScore < 12) {
        recommendations.push('Add frequent visual/audio feedback for player actions')
        recommendations.push('Consider XP gem-style collectibles for constant reward')
      }
      if (inputScore < 10) {
        recommendations.push('Explore auto-attack or reduced input options')
      }
      if (powerScore < 12) {
        recommendations.push('Add weapon evolution or synergy systems')
        recommendations.push('Let players become intentionally overpowered')
      }
      if (unlockScore < 8) {
        recommendations.push('Implement character/weapon unlocks tied to runs')
      }

      // Interpretation
      let interpretation: string
      if (finalScore >= 80) {
        interpretation =
          'Exceptional VS-style design. Expect strong appeal to action roguelike and casual audiences. Highly streamable.'
      } else if (finalScore >= 60) {
        interpretation =
          'Good VS elements. Could compete in survivors-like market with polish. Consider what differentiates from VS clones.'
      } else if (finalScore >= 40) {
        interpretation =
          'Moderate action elements. May appeal to different audience than VS fans. Identify your unique hook.'
      } else if (finalScore >= 20) {
        interpretation =
          'Limited VS overlap. Design likely targets different player motivations. This is valid - not everything needs to be VS-like.'
      } else {
        interpretation =
          'Minimal action/accessibility focus. Compare against different reference games for more relevant insights.'
      }

      return JSON.stringify({
        success: true,
        scoreName: 'Vampire Survivors Score',
        scoreType: 'Action/Survivors-like Elements',
        finalScore,
        maxScore: 100,

        breakdown: dimensionScores,

        insights,
        recommendations,
        interpretation,

        calibration: {
          note: 'Score calibrated against known games',
          references: REFERENCE_SCORES,
        },

        // VS-specific hooks
        vsFormulaChecklist: {
          autoAttack: allText.includes('auto'),
          constantRewards: allText.includes('xp') || allText.includes('gem'),
          evolutionSystem: allText.includes('evolution') || allText.includes('evolve'),
          metaProgression: allText.includes('unlock') || allText.includes('permanent'),
          sessionBoundary: allText.includes('run') || allText.includes('wave'),
        },

        _analysis: {
          mechanicCount: mechanics.length,
          uniqueTypes: Array.from(mechanicTypes),
          hasAuto: allText.includes('auto'),
          hasSurvive: allText.includes('survive'),
          hasUpgrade: allText.includes('upgrade') || allText.includes('evolution'),
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Scoring failed',
        finalScore: 0,
        maxScore: 100,
      })
    }
  },
})
