/**
 * Counter-Strike Scorer Tool
 *
 * Scores the loop design against competitive tactical shooter criteria.
 *
 * SECRET SAUCE: Expert analysis of Counter-Strike's enduring formula:
 * - Skill expression purity (raw skill matters)
 * - Economy meta-game (strategic depth through resources)
 * - Team dynamics (coordination as mechanic)
 * - Round structure (session within session)
 * - Competitive ladder (long-term motivation)
 *
 * This is a HIDDEN score - used for internal analysis.
 */

import { createLoopStructuredTool } from '../structured-tool'
import { mechanicsLoopsToolSchema } from '../mechanics-loops-schema'
import {
  buildCounterStrikeEsportsFactors,
  buildCounterStrikeInsights,
  buildCounterStrikeRecommendations,
  interpretCounterStrikeScore,
} from './counter-strike-report'

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
 * Expert-calibrated Counter-Strike scoring dimensions
 */
const SCORING_DIMENSIONS: ScoringDimension[] = [
  {
    name: 'Skill Expression Purity',
    weight: 0.25,
    maxPoints: 25,
    description: 'Raw mechanical skill directly determines outcomes',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Skill indicators
      const skillIndicators = [
        { term: 'skill', points: 4, note: 'Skill-based design' },
        { term: 'aim', points: 5, note: 'Aiming mechanics' },
        { term: 'precision', points: 4, note: 'Precision required' },
        { term: 'reflex', points: 4, note: 'Reflex-based gameplay' },
        { term: 'timing', points: 3, note: 'Timing mechanics' },
        { term: 'mastery', points: 4, note: 'Mastery curve' },
        { term: 'practice', points: 2, note: 'Practice rewarded' },
        { term: 'headshot', points: 5, note: 'Headshot mechanics (CS signature)' },
        { term: 'spray', points: 4, note: 'Spray patterns' },
        { term: 'recoil', points: 4, note: 'Recoil control' },
      ]

      for (const indicator of skillIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // CS special: No RNG in core combat
      if (!analysis.allText.includes('random') && !analysis.allText.includes('luck')) {
        score += 3
        notes.push('Deterministic outcomes (CS philosophy)')
      }

      // Penalty: Heavy RNG reduces skill expression
      if (analysis.allText.includes('random') || analysis.allText.includes('rng')) {
        score -= 4
        notes.push('RNG present (reduces pure skill)')
      }

      // Check for skill mechanics
      const skillMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('skill') ||
          m.name.toLowerCase().includes('aim') ||
          m.description?.toLowerCase().includes('precision')
      )
      if (skillMechanics.length > 0) {
        score += 3
        notes.push('Dedicated skill mechanics')
      }

      return { score: Math.min(25, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Economy Meta-Game',
    weight: 0.2,
    maxPoints: 20,
    description: 'Resource management adding strategic depth between rounds',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Economy indicators
      const economyIndicators = [
        { term: 'economy', points: 6, note: 'Economy system (CS core)' },
        { term: 'money', points: 4, note: 'Money management' },
        { term: 'currency', points: 3, note: 'Currency system' },
        { term: 'buy', points: 4, note: 'Buy phase' },
        { term: 'purchase', points: 3, note: 'Purchase decisions' },
        { term: 'save', points: 3, note: 'Save rounds (CS strategy)' },
        { term: 'eco', points: 5, note: 'Eco rounds' },
        { term: 'invest', points: 2, note: 'Investment decisions' },
        { term: 'loadout', points: 3, note: 'Loadout choices' },
      ]

      for (const indicator of economyIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // CS special: Economy persists across rounds
      if (
        analysis.allText.includes('round') &&
        (analysis.allText.includes('money') || analysis.allText.includes('economy'))
      ) {
        score += 4
        notes.push('Round-persistent economy (CS signature)')
      }

      // Check for economy mechanics
      const econMechanics = analysis.mechanics.filter(
        m =>
          m.type?.toLowerCase().includes('economy') ||
          m.name.toLowerCase().includes('buy') ||
          m.name.toLowerCase().includes('money')
      )
      if (econMechanics.length > 0) {
        score += 3
        notes.push('Dedicated economy mechanics')
      }

      return { score: Math.min(20, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Team Dynamics',
    weight: 0.2,
    maxPoints: 20,
    description: 'Team coordination as core gameplay element',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Team indicators
      const teamIndicators = [
        { term: 'team', points: 5, note: 'Team-based gameplay' },
        { term: 'coordinate', points: 4, note: 'Coordination mechanics' },
        { term: 'communication', points: 4, note: 'Communication emphasis' },
        { term: 'callout', points: 4, note: 'Callout systems (CS staple)' },
        { term: 'strategy', points: 3, note: 'Team strategy' },
        { term: 'role', points: 3, note: 'Team roles' },
        { term: 'support', points: 2, note: 'Support play' },
        { term: 'trade', points: 4, note: 'Trade fragging (CS tactic)' },
        { term: 'flash', points: 3, note: 'Utility coordination' },
        { term: 'smoke', points: 3, note: 'Utility coordination' },
      ]

      for (const indicator of teamIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // Multiplayer is required for CS-style
      if (
        analysis.allText.includes('multiplayer') ||
        analysis.allText.includes('pvp') ||
        analysis.allText.includes('versus')
      ) {
        score += 4
        notes.push('Multiplayer core')
      }

      // Penalty: Solo-focused design
      if (analysis.allText.includes('single player') || analysis.allText.includes('singleplayer')) {
        score -= 5
        notes.push('Single-player focus (not CS-style)')
      }

      return { score: Math.min(20, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Round Structure',
    weight: 0.2,
    maxPoints: 20,
    description: 'Match divided into discrete rounds with win conditions',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Round structure indicators
      const roundIndicators = [
        { term: 'round', points: 6, note: 'Round-based structure' },
        { term: 'match', points: 4, note: 'Match format' },
        { term: 'best of', points: 4, note: 'Best-of format' },
        { term: 'half', points: 3, note: 'Half-time structure' },
        { term: 'overtime', points: 3, note: 'Overtime system' },
        { term: 'win condition', points: 3, note: 'Clear win conditions' },
        { term: 'objective', points: 3, note: 'Objective-based' },
        { term: 'bomb', points: 5, note: 'Bomb/defuse mode (CS signature)' },
        { term: 'hostage', points: 3, note: 'Hostage mode' },
        { term: 'elimination', points: 3, note: 'Elimination rounds' },
      ]

      for (const indicator of roundIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // CS special: Death is meaningful
      if (!analysis.allText.includes('respawn') || analysis.allText.includes('no respawn')) {
        score += 4
        notes.push('No respawn (CS signature - death matters)')
      }

      // Round + Match structure
      if (analysis.allText.includes('round') && analysis.allText.includes('match')) {
        score += 2
        notes.push('Match contains rounds structure')
      }

      return { score: Math.min(20, Math.max(0, score)), notes }
    },
  },
  {
    name: 'Competitive Ladder',
    weight: 0.15,
    maxPoints: 15,
    description: 'Ranked progression driving long-term engagement',
    scoringLogic: analysis => {
      let score = 0
      const notes: string[] = []

      // Competitive indicators
      const compIndicators = [
        { term: 'rank', points: 5, note: 'Ranking system' },
        { term: 'competitive', points: 4, note: 'Competitive mode' },
        { term: 'elo', points: 4, note: 'ELO/MMR system' },
        { term: 'mmr', points: 4, note: 'MMR system' },
        { term: 'ladder', points: 4, note: 'Ladder climbing' },
        { term: 'league', points: 3, note: 'League structure' },
        { term: 'tournament', points: 3, note: 'Tournament support' },
        { term: 'esport', points: 4, note: 'Esports ready' },
        { term: 'season', points: 3, note: 'Seasonal resets' },
      ]

      for (const indicator of compIndicators) {
        if (analysis.allText.includes(indicator.term)) {
          score += indicator.points
          notes.push(indicator.note)
        }
      }

      // CS special: Long-term prestige
      if (
        analysis.allText.includes('rank') &&
        (analysis.allText.includes('global') || analysis.allText.includes('elite'))
      ) {
        score += 3
        notes.push('Prestige ranks (CS motivation)')
      }

      return { score: Math.min(15, Math.max(0, score)), notes }
    },
  },
]

/**
 * Reference scores for calibration
 */
const REFERENCE_SCORES = {
  'Counter-Strike 2': { score: 95, notes: 'The definitive tactical shooter' },
  Valorant: { score: 85, notes: 'CS-like with abilities' },
  'Rainbow Six Siege': { score: 78, notes: 'Tactical but different structure' },
  'Call of Duty (Search & Destroy)': { score: 65, notes: 'Round-based but faster' },
  Overwatch: { score: 45, notes: 'Team-based but different economy' },
  'Vampire Survivors': { score: 5, notes: 'No competitive elements' },
  'Disco Elysium': { score: 2, notes: 'No action/competitive elements' },
  Hades: { score: 15, notes: 'Some skill expression, no PvP' },
}

/**
 * Counter-Strike scorer tool
 */
export const counterStrikeScorerTool = createLoopStructuredTool({
  name: 'counter_strike_scorer',
  description: `Score the game design against Counter-Strike-style competitive shooter criteria.
Evaluates:
- Skill Expression Purity (25%): Aim, reflexes, deterministic outcomes
- Economy Meta-Game (20%): Buy rounds, money management, strategic depth
- Team Dynamics (20%): Coordination, communication, roles
- Round Structure (20%): Discrete rounds, win conditions, no respawn
- Competitive Ladder (15%): Ranking, seasons, esports potential

Returns 0-100 score with detailed breakdown. High scores indicate strong competitive shooter appeal.`,
  schema: mechanicsLoopsToolSchema,
  func: async input => {
    const { mechanics, loops, gameDescription } = mechanicsLoopsToolSchema.parse(input)
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

      const skillScore = dimensionScores['Skill Expression Purity'].score
      const economyScore = dimensionScores['Economy Meta-Game'].score
      const teamScore = dimensionScores['Team Dynamics'].score
      const roundScore = dimensionScores['Round Structure'].score
      const compScore = dimensionScores['Competitive Ladder'].score

      const insights = buildCounterStrikeInsights(dimensionScores, finalScore)
      const recommendations = buildCounterStrikeRecommendations(dimensionScores, finalScore)
      const interpretation = interpretCounterStrikeScore(finalScore)

      return JSON.stringify({
        success: true,
        scoreName: 'Counter-Strike Score',
        scoreType: 'Competitive Tactical Shooter Elements',
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

        // CS-specific checklist
        csFormulaChecklist: {
          skillBasedCombat: skillScore >= 12,
          economySystem: economyScore >= 10,
          teamRequired: teamScore >= 10,
          roundStructure: roundScore >= 10,
          rankedPlay: compScore >= 8,
          noRespawn: !analysis.allText.includes('respawn'),
          objectiveModes:
            analysis.allText.includes('bomb') || analysis.allText.includes('objective'),
        },

        // Esports readiness assessment
        esportsReadiness: {
          score: Math.round(((skillScore + teamScore + compScore) / 3) * 4),
          factors: buildCounterStrikeEsportsFactors(dimensionScores),
        },

        _analysis: {
          mechanicCount: mechanics.length,
          uniqueTypes: Array.from(mechanicTypes),
          hasAim: analysis.allText.includes('aim'),
          hasEconomy: analysis.allText.includes('economy') || analysis.allText.includes('buy'),
          hasTeam: analysis.allText.includes('team'),
          hasRanked: analysis.allText.includes('rank') || analysis.allText.includes('competitive'),
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
