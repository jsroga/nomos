/**
 * Smart Metrics Planner Tool
 *
 * Suggests relevant KPIs and metrics based on game type, loop structure, and business model.
 * SECRET SAUCE: Real benchmark data from successful games and expert metric recommendations.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Metric definition with benchmarks
 */
interface MetricDefinition {
  name: string
  category: 'engagement' | 'retention' | 'monetization' | 'virality' | 'quality' | 'loop_health'
  description: string
  formula?: string
  importance: 'critical' | 'important' | 'nice_to_have'
  benchmarks: {
    poor: string
    average: string
    good: string
    excellent: string
  }
  applicableGenres: string[]
  measurementTiming: string
  exampleFromGame?: {
    game: string
    value: string
    insight: string
  }
}

/**
 * SECRET SAUCE: Curated metrics with real benchmarks
 */
const METRIC_DATABASE: MetricDefinition[] = [
  // === ENGAGEMENT METRICS ===
  {
    name: 'Core Loop Completion Rate',
    category: 'loop_health',
    description: 'Percentage of players who complete at least one full core loop cycle',
    formula: 'players_completed_loop / players_started * 100',
    importance: 'critical',
    benchmarks: {
      poor: '<50%',
      average: '50-70%',
      good: '70-85%',
      excellent: '>85%',
    },
    applicableGenres: ['roguelike', 'survivors-like', 'action', 'all'],
    measurementTiming: 'First session',
    exampleFromGame: {
      game: 'Vampire Survivors',
      value: '92%',
      insight: 'Auto-attack removes friction - nearly everyone completes their first loop',
    },
  },
  {
    name: 'Session Length',
    category: 'engagement',
    description: 'Average time spent per play session',
    formula: 'total_playtime / session_count',
    importance: 'critical',
    benchmarks: {
      poor: '<10 min',
      average: '15-25 min',
      good: '30-45 min',
      excellent: '>60 min',
    },
    applicableGenres: ['roguelike', 'action', 'rpg', 'strategy'],
    measurementTiming: 'Weekly average',
    exampleFromGame: {
      game: 'Hades',
      value: '35 minutes',
      insight: 'Matches their run length - players finish what they start',
    },
  },
  {
    name: 'Sessions Per Day',
    category: 'engagement',
    description: 'Number of play sessions per active user per day',
    formula: 'daily_sessions / daily_active_users',
    importance: 'important',
    benchmarks: {
      poor: '<1.2',
      average: '1.5-2',
      good: '2-3',
      excellent: '>3',
    },
    applicableGenres: ['mobile', 'casual', 'survivors-like'],
    measurementTiming: 'Daily',
    exampleFromGame: {
      game: 'Vampire Survivors',
      value: '2.8',
      insight: 'One more run mentality - short sessions encourage multiple plays',
    },
  },
  {
    name: 'Time to First Win',
    category: 'loop_health',
    description: 'Average time until player achieves their first significant victory',
    importance: 'critical',
    benchmarks: {
      poor: '>3 hours',
      average: '1-2 hours',
      good: '30-60 min',
      excellent: '<30 min',
    },
    applicableGenres: ['roguelike', 'action', 'survivors-like'],
    measurementTiming: 'First week',
    exampleFromGame: {
      game: 'Slay the Spire',
      value: '2-3 hours',
      insight: 'Acceptable because each loss teaches meaningful lessons',
    },
  },

  // === RETENTION METRICS ===
  {
    name: 'Day 1 Retention (D1)',
    category: 'retention',
    description: 'Percentage of new users who return the next day',
    formula: 'users_day_1 / new_users_day_0 * 100',
    importance: 'critical',
    benchmarks: {
      poor: '<30%',
      average: '35-45%',
      good: '45-55%',
      excellent: '>55%',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Day after first session',
    exampleFromGame: {
      game: 'Balatro',
      value: '62%',
      insight: 'Poker familiarity + discovery hooks drive exceptional D1',
    },
  },
  {
    name: 'Day 7 Retention (D7)',
    category: 'retention',
    description: 'Percentage of new users still playing after one week',
    formula: 'users_day_7 / new_users_day_0 * 100',
    importance: 'critical',
    benchmarks: {
      poor: '<10%',
      average: '15-20%',
      good: '20-30%',
      excellent: '>30%',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Week after first session',
    exampleFromGame: {
      game: 'Hades',
      value: '38%',
      insight: 'Story hooks and relationship progression drive long-term return',
    },
  },
  {
    name: 'Day 30 Retention (D30)',
    category: 'retention',
    description: 'Percentage of new users still playing after one month',
    formula: 'users_day_30 / new_users_day_0 * 100',
    importance: 'important',
    benchmarks: {
      poor: '<5%',
      average: '8-12%',
      good: '12-18%',
      excellent: '>18%',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Month after first session',
    exampleFromGame: {
      game: 'Dead Cells',
      value: '15%',
      insight: 'Meta-progression and DLC keeps long-term engagement',
    },
  },
  {
    name: 'Churn Point',
    category: 'retention',
    description: 'The point where most players stop playing',
    importance: 'critical',
    benchmarks: {
      poor: 'Before completing tutorial',
      average: 'After 3-5 sessions',
      good: 'After unlocking all content',
      excellent: 'Natural completion, return for updates',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Cohort analysis',
    exampleFromGame: {
      game: 'Cult of the Lamb',
      value: 'After ~20 hours',
      insight: 'Split focus between combat and management causes earlier churn',
    },
  },

  // === LOOP-SPECIFIC METRICS ===
  {
    name: 'Loop Friction Score',
    category: 'loop_health',
    description: 'Measure of how much resistance players face completing loops',
    formula: 'average_inputs_per_loop_cycle / minimum_possible_inputs',
    importance: 'critical',
    benchmarks: {
      poor: '>3x minimum',
      average: '2-3x minimum',
      good: '1.5-2x minimum',
      excellent: '<1.5x minimum',
    },
    applicableGenres: ['survivors-like', 'idle', 'casual'],
    measurementTiming: 'Design time + post-launch telemetry',
    exampleFromGame: {
      game: 'Vampire Survivors',
      value: '1.1x (just movement)',
      insight: 'Removing attack input dropped friction to near-zero',
    },
  },
  {
    name: 'Reward Frequency',
    category: 'loop_health',
    description: 'How often players receive positive feedback/rewards',
    formula: 'rewards_given / session_time_minutes',
    importance: 'critical',
    benchmarks: {
      poor: '<1 per minute',
      average: '1-2 per minute',
      good: '3-5 per minute',
      excellent: '>5 per minute',
    },
    applicableGenres: ['survivors-like', 'action', 'roguelike'],
    measurementTiming: 'Continuous measurement',
    exampleFromGame: {
      game: 'Vampire Survivors',
      value: '6-10 per minute',
      insight: 'Constant XP gems + level ups create dopamine rhythm',
    },
  },
  {
    name: 'Meta-Loop Engagement',
    category: 'loop_health',
    description: 'Percentage of players engaging with progression systems between sessions',
    formula: 'players_accessing_meta_features / total_players * 100',
    importance: 'important',
    benchmarks: {
      poor: '<20%',
      average: '30-50%',
      good: '50-70%',
      excellent: '>70%',
    },
    applicableGenres: ['roguelike', 'rpg', 'gacha'],
    measurementTiming: 'Per session',
    exampleFromGame: {
      game: 'Hades',
      value: '85%',
      insight: 'Story progression in hub makes meta-loop mandatory and enjoyable',
    },
  },
  {
    name: 'Build Diversity Index',
    category: 'loop_health',
    description: 'Variety of player builds/strategies used',
    formula: 'unique_builds_used / total_builds_possible',
    importance: 'important',
    benchmarks: {
      poor: '<10%',
      average: '20-40%',
      good: '40-60%',
      excellent: '>60%',
    },
    applicableGenres: ['roguelike', 'deck-builder', 'rpg'],
    measurementTiming: 'Weekly aggregate',
    exampleFromGame: {
      game: 'Slay the Spire',
      value: '55%',
      insight: 'Forced adaptation to encounters creates natural build variety',
    },
  },

  // === MONETIZATION METRICS ===
  {
    name: 'Conversion Rate',
    category: 'monetization',
    description: 'Percentage of players who make any purchase',
    formula: 'paying_users / total_users * 100',
    importance: 'critical',
    benchmarks: {
      poor: '<2%',
      average: '2-5%',
      good: '5-10%',
      excellent: '>10%',
    },
    applicableGenres: ['f2p', 'mobile', 'gacha'],
    measurementTiming: 'Lifetime',
    exampleFromGame: {
      game: 'Genshin Impact',
      value: '5-7%',
      insight: 'Gacha + FOMO creates strong conversion despite low rate',
    },
  },
  {
    name: 'ARPDAU (Average Revenue Per Daily Active User)',
    category: 'monetization',
    description: 'Daily revenue divided by daily active users',
    formula: 'daily_revenue / daily_active_users',
    importance: 'critical',
    benchmarks: {
      poor: '<$0.05',
      average: '$0.05-0.15',
      good: '$0.15-0.30',
      excellent: '>$0.30',
    },
    applicableGenres: ['f2p', 'mobile'],
    measurementTiming: 'Daily',
    exampleFromGame: {
      game: 'Clash Royale',
      value: '$0.25',
      insight: 'Competitive + collection drives high spending',
    },
  },
  {
    name: 'LTV (Lifetime Value)',
    category: 'monetization',
    description: 'Total revenue expected from average player',
    formula: 'total_revenue / total_players',
    importance: 'critical',
    benchmarks: {
      poor: '<$1',
      average: '$1-5',
      good: '$5-20',
      excellent: '>$20',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Cohort-based projection',
    exampleFromGame: {
      game: 'Vampire Survivors',
      value: '$3-4',
      insight: 'Low price but near-100% conversion makes LTV reliable',
    },
  },

  // === VIRALITY METRICS ===
  {
    name: 'K-Factor',
    category: 'virality',
    description: 'Viral coefficient - how many new users each user brings',
    formula: 'invites_sent * conversion_rate',
    importance: 'important',
    benchmarks: {
      poor: '<0.2',
      average: '0.2-0.5',
      good: '0.5-0.8',
      excellent: '>1.0 (viral growth)',
    },
    applicableGenres: ['social', 'competitive', 'co-op'],
    measurementTiming: 'Monthly',
    exampleFromGame: {
      game: 'Among Us',
      value: '>2.0 at peak',
      insight: 'Social deduction + streaming created explosive virality',
    },
  },
  {
    name: 'Content Creator Coverage',
    category: 'virality',
    description: 'Number of content creators covering the game',
    importance: 'important',
    benchmarks: {
      poor: '<10 videos/streams',
      average: '50-200 videos',
      good: '500-2000 videos',
      excellent: '>5000 videos',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Monthly',
    exampleFromGame: {
      game: 'Balatro',
      value: '>10,000 YouTube videos in first month',
      insight: 'Big number moments + poker familiarity drove creator interest',
    },
  },

  // === QUALITY METRICS ===
  {
    name: 'Review Score',
    category: 'quality',
    description: 'Aggregate review score from players',
    importance: 'important',
    benchmarks: {
      poor: '<70%',
      average: '70-80%',
      good: '80-90%',
      excellent: '>90%',
    },
    applicableGenres: ['all'],
    measurementTiming: 'Ongoing',
    exampleFromGame: {
      game: 'Hades',
      value: '93% (Overwhelmingly Positive)',
      insight: 'Polish + narrative + gameplay alignment creates universal praise',
    },
  },
  {
    name: 'Completion Rate',
    category: 'quality',
    description: 'Percentage of players who "beat" the game',
    importance: 'nice_to_have',
    benchmarks: {
      poor: '<5%',
      average: '10-20%',
      good: '20-40%',
      excellent: '>40%',
    },
    applicableGenres: ['narrative', 'action', 'roguelike'],
    measurementTiming: 'Lifetime',
    exampleFromGame: {
      game: 'Celeste',
      value: '28%',
      insight: 'Assist mode significantly increased completion rate',
    },
  },
]

/**
 * Genre-specific metric priorities
 */
const GENRE_METRIC_PRIORITIES: Record<string, string[]> = {
  'survivors-like': [
    'Core Loop Completion Rate',
    'Reward Frequency',
    'Sessions Per Day',
    'Loop Friction Score',
    'Day 1 Retention (D1)',
  ],
  roguelike: [
    'Time to First Win',
    'Build Diversity Index',
    'Day 7 Retention (D7)',
    'Meta-Loop Engagement',
    'Session Length',
  ],
  'deck-builder': [
    'Build Diversity Index',
    'Core Loop Completion Rate',
    'Day 7 Retention (D7)',
    'Time to First Win',
    'Meta-Loop Engagement',
  ],
  narrative: [
    'Session Length',
    'Completion Rate',
    'Review Score',
    'Day 30 Retention (D30)',
    'Churn Point',
  ],
  rpg: [
    'Session Length',
    'Meta-Loop Engagement',
    'Build Diversity Index',
    'Day 7 Retention (D7)',
    'Completion Rate',
  ],
  action: [
    'Core Loop Completion Rate',
    'Session Length',
    'Day 1 Retention (D1)',
    'Time to First Win',
    'Review Score',
  ],
  strategy: [
    'Session Length',
    'Day 7 Retention (D7)',
    'Day 30 Retention (D30)',
    'Build Diversity Index',
    'Review Score',
  ],
  casual: [
    'Day 1 Retention (D1)',
    'Sessions Per Day',
    'Core Loop Completion Rate',
    'LTV (Lifetime Value)',
    'Loop Friction Score',
  ],
  competitive: [
    'Sessions Per Day',
    'Day 30 Retention (D30)',
    'K-Factor',
    'ARPDAU (Average Revenue Per Daily Active User)',
    'Content Creator Coverage',
  ],
  mobile: [
    'Day 1 Retention (D1)',
    'Sessions Per Day',
    'ARPDAU (Average Revenue Per Daily Active User)',
    'Conversion Rate',
    'LTV (Lifetime Value)',
  ],
  f2p: [
    'Conversion Rate',
    'ARPDAU (Average Revenue Per Daily Active User)',
    'LTV (Lifetime Value)',
    'Day 7 Retention (D7)',
    'K-Factor',
  ],
  // Default fallback for unknown genres
  default: [
    'Day 1 Retention (D1)',
    'Day 7 Retention (D7)',
    'Session Length',
    'Core Loop Completion Rate',
    'Review Score',
  ],
}

/**
 * Smart metrics planner tool
 */
export const metricsPlannerTool = new DynamicStructuredTool({
  name: 'metrics_planner',
  description: `Plan which KPIs and metrics to track based on game type. Returns:
- Prioritized metrics for your specific game type
- Industry benchmarks with examples from successful games
- Measurement timing and formulas
- Custom metric recommendations
Use this to understand what "good" looks like and set realistic targets.`,
  schema: z.object({
    gameGenre: z.string().describe('Primary game genre'),
    gameSubgenre: z.string().optional().describe('Subgenre if applicable'),
    businessModel: z
      .enum(['premium', 'f2p', 'freemium', 'subscription'])
      .describe('Monetization approach'),
    platform: z.enum(['pc', 'mobile', 'console', 'multi-platform']).describe('Target platform'),
    developmentPhase: z
      .enum(['concept', 'prototype', 'production', 'launch', 'live'])
      .optional()
      .describe('Current development phase'),
    focusAreas: z
      .array(z.enum(['engagement', 'retention', 'monetization', 'virality', 'loop_health']))
      .optional()
      .describe('Specific areas to focus metrics on'),
  }),
  func: async ({
    gameGenre,
    gameSubgenre,
    businessModel,
    platform,
    developmentPhase,
    focusAreas,
  }): Promise<string> => {
    try {
      const genreLower = gameGenre.toLowerCase()

      // Find genre-specific priorities
      let priorityMetricNames: string[] = []
      for (const [genre, metrics] of Object.entries(GENRE_METRIC_PRIORITIES)) {
        if (genre !== 'default' && (genreLower.includes(genre) || genre.includes(genreLower))) {
          priorityMetricNames = metrics
          break
        }
      }

      // Use default if no genre match found
      if (priorityMetricNames.length === 0) {
        priorityMetricNames = GENRE_METRIC_PRIORITIES['default']
      }

      // Add business model specific metrics
      if (businessModel === 'f2p' || businessModel === 'freemium') {
        priorityMetricNames = [...priorityMetricNames, ...GENRE_METRIC_PRIORITIES['f2p']]
      }

      // Add platform specific metrics
      if (platform === 'mobile') {
        priorityMetricNames = [...priorityMetricNames, ...GENRE_METRIC_PRIORITIES['mobile']]
      }

      // Dedupe and limit
      priorityMetricNames = [...new Set(priorityMetricNames)].slice(0, 10)

      // Get full metric definitions
      const priorityMetrics = priorityMetricNames
        .map(name => METRIC_DATABASE.find(m => m.name === name))
        .filter(Boolean) as MetricDefinition[]

      // Filter by focus areas if specified
      let filteredMetrics = priorityMetrics
      if (focusAreas && focusAreas.length > 0) {
        filteredMetrics = priorityMetrics.filter(m => focusAreas.includes(m.category))
      }

      // Add remaining critical metrics not in priority list
      const criticalMetrics = METRIC_DATABASE.filter(
        m => m.importance === 'critical' && !priorityMetricNames.includes(m.name)
      ).slice(0, 3)

      // Development phase specific recommendations
      const phaseRecommendations: Record<string, string[]> = {
        concept: [
          'Focus on loop design metrics - ensure core loop is compelling',
          'Benchmark against successful competitors loop metrics',
          'Define target session length based on genre',
        ],
        prototype: [
          'Measure Core Loop Completion Rate in playtests',
          'Track Time to First Win to calibrate difficulty',
          'Watch for friction points in loop transitions',
        ],
        production: [
          'Set up analytics infrastructure now',
          'Define benchmark targets before launch',
          'Plan A/B tests for key metrics',
        ],
        launch: [
          'Monitor D1/D7 retention closely',
          'Watch for unexpected churn points',
          'Track content creator coverage for virality signals',
        ],
        live: [
          'Focus on long-term retention (D30+)',
          'Optimize monetization without hurting retention',
          'Monitor update impact on all key metrics',
        ],
      }

      // Custom metric suggestions based on game type
      const customMetricSuggestions: string[] = []

      if (genreLower.includes('roguelike') || genreLower.includes('survivors')) {
        customMetricSuggestions.push(
          'Run Completion Rate: % of runs that reach natural end vs rage quit',
          'Build Satisfaction Score: Player rating of their final build',
          'Unlock Velocity: Rate of progression unlocks per session'
        )
      }

      if (businessModel === 'f2p') {
        customMetricSuggestions.push(
          'Paywall Conversion: % converting at each paywall',
          'Ad Skip Rate: % paying to skip ads (if applicable)',
          'Whale Concentration: % of revenue from top 1% spenders'
        )
      }

      if (platform === 'mobile') {
        customMetricSuggestions.push(
          'Portrait vs Landscape Usage: If applicable',
          'Background Return Rate: % returning after app backgrounded',
          'Notification Response Rate: % engaging with push notifications'
        )
      }

      return JSON.stringify({
        success: true,
        gameProfile: {
          genre: gameGenre,
          subgenre: gameSubgenre,
          businessModel,
          platform,
          phase: developmentPhase,
        },

        // Primary metrics to track
        priorityMetrics: filteredMetrics.map(m => ({
          name: m.name,
          category: m.category,
          importance: m.importance,
          description: m.description,
          formula: m.formula,
          benchmarks: m.benchmarks,
          measurementTiming: m.measurementTiming,
          realWorldExample: m.exampleFromGame,
        })),

        // Additional critical metrics
        additionalCriticalMetrics: criticalMetrics.map(m => ({
          name: m.name,
          category: m.category,
          description: m.description,
          benchmarks: m.benchmarks,
        })),

        // Phase-specific advice
        phaseRecommendations: developmentPhase
          ? phaseRecommendations[developmentPhase]
          : phaseRecommendations['concept'],

        // Custom metrics to consider
        customMetricSuggestions,

        // Target setting guidance
        targetGuidance: {
          conservative: 'Aim for "average" benchmarks initially',
          ambitious: 'Target "good" benchmarks for launch',
          exceptional: '"Excellent" benchmarks indicate viral potential',
          warning: 'Dont ignore metrics below "poor" threshold - indicates fundamental issues',
        },

        // Quick reference card
        quickReference: {
          mustTrack: filteredMetrics.filter(m => m.importance === 'critical').map(m => m.name),
          shouldTrack: filteredMetrics.filter(m => m.importance === 'important').map(m => m.name),
          launchTargets: filteredMetrics.slice(0, 3).map(m => ({
            metric: m.name,
            target: m.benchmarks.good,
          })),
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Metrics planning failed',
      })
    }
  },
})

export { METRIC_DATABASE, GENRE_METRIC_PRIORITIES }
