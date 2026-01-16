/**
 * Audience Analyzer Tool
 *
 * Analyzes how well the game loop fits target audiences using psychographic profiling.
 *
 * SECRET SAUCE: Deep audience understanding including:
 * - Bartle player types + modern refinements
 * - Spending behavior patterns
 * - Session preferences by life situation
 * - Platform-specific audience traits
 * - Engagement motivations
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { AudienceFitData } from '../types'

/**
 * Comprehensive audience psychographic profiles
 */
interface AudienceProfile {
  id: string
  name: string
  description: string
  size: string // Market size estimate

  // Psychographics
  motivations: string[]
  frustrationsToAvoid: string[]
  valueProportion: string // What they value most

  // Behavioral
  sessionBehavior: {
    preferredLength: string
    frequency: string
    timeOfDay: string
    interruptibility: string
  }

  // Spending
  spendingBehavior: {
    averageSpend: string
    triggers: string[]
    turnoffs: string[]
    preferredModels: string[]
  }

  // Preferences
  gamePreferences: {
    complexity: 'low' | 'medium' | 'high'
    socialRequired: boolean
    competitiveInterest: 'none' | 'casual' | 'serious'
    storyImportance: 'none' | 'light' | 'important' | 'essential'
    replayExpectation: string
  }

  // Matching
  positiveIndicators: { term: string; weight: number }[]
  negativeIndicators: { term: string; weight: number }[]

  // Examples
  gameExamples: string[]

  // Recommendations
  designAdvice: string[]
}

const AUDIENCE_PROFILES: AudienceProfile[] = [
  {
    id: 'achiever',
    name: 'Achievement Hunter',
    description:
      'Motivated by mastery, completion, and visible accomplishment. Loves checklists, unlocks, and 100% completion.',
    size: '~25% of core gamers',

    motivations: [
      'Completing collections',
      'Mastering systems',
      'Earning rare achievements',
      'Visible progress indicators',
      'Being recognized as skilled',
    ],
    frustrationsToAvoid: [
      'Unobtainable achievements',
      'Hidden requirements',
      'RNG-gated completionism',
      'Time-limited exclusives (FOMO)',
      'Progress resets',
    ],
    valueProportion:
      'Depth over breadth - prefers one game fully completed over many partially played',

    sessionBehavior: {
      preferredLength: '1-3 hours',
      frequency: 'Daily when engaged, then moves on',
      timeOfDay: 'Evening focused sessions',
      interruptibility: 'Low - prefers uninterrupted completion sessions',
    },

    spendingBehavior: {
      averageSpend: '$30-60 per game',
      triggers: ['Complete edition sales', 'Achievement-adding DLC', 'Quality of life features'],
      turnoffs: ['Endless content', 'Pay-to-skip', 'Subscription requirements'],
      preferredModels: ['Premium with DLC', 'Complete editions'],
    },

    gamePreferences: {
      complexity: 'medium',
      socialRequired: false,
      competitiveInterest: 'casual',
      storyImportance: 'light',
      replayExpectation: 'Moderate - will replay for achievements',
    },

    positiveIndicators: [
      { term: 'achievement', weight: 5 },
      { term: 'unlock', weight: 4 },
      { term: 'complete', weight: 3 },
      { term: 'collect', weight: 4 },
      { term: 'mastery', weight: 4 },
      { term: 'challenge', weight: 3 },
      { term: 'progress', weight: 3 },
      { term: 'reward', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'random', weight: -3 },
      { term: 'endless', weight: -2 },
      { term: 'roguelike', weight: -1 }, // Mixed - some achievers like it
      { term: 'daily', weight: -2 },
    ],

    gameExamples: [
      'Hollow Knight',
      'Celeste',
      'Hades (for god mode completion)',
      'Enter the Gungeon',
    ],

    designAdvice: [
      'Provide clear progress tracking toward all unlocks',
      'Include optional hard challenges for bragging rights',
      'Make 100% completion difficult but achievable',
      'Show statistics and completion percentages',
      'Avoid RNG-gated achievements',
    ],
  },
  {
    id: 'explorer',
    name: 'Discovery Seeker',
    description:
      'Driven by curiosity and finding hidden content. Loves secrets, lore, and emergent discoveries.',
    size: '~20% of core gamers',

    motivations: [
      'Finding hidden content',
      'Understanding systems deeply',
      'Discovering emergent interactions',
      'Exploring every corner',
      'Sharing discoveries with others',
    ],
    frustrationsToAvoid: [
      'Linear forced paths',
      'Obvious/hand-held content',
      'Shallow systems',
      'Spoiler-heavy communities',
      'Everything explained upfront',
    ],
    valueProportion:
      'Breadth of discovery - prefers games with many secrets over games with obvious content',

    sessionBehavior: {
      preferredLength: '2-4 hours',
      frequency: 'Sporadic but deep when engaged',
      timeOfDay: 'Late evening/night exploration sessions',
      interruptibility: 'Medium - can pause exploration',
    },

    spendingBehavior: {
      averageSpend: '$20-40 per game',
      triggers: ['Mystery DLC', 'Expansion content', 'Lore additions'],
      turnoffs: ['Obvious content reveals', 'Pay-to-reveal', 'Time-gated exploration'],
      preferredModels: ['Premium', 'Expansion packs'],
    },

    gamePreferences: {
      complexity: 'high',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'important',
      replayExpectation: 'High - will replay to find missed content',
    },

    positiveIndicators: [
      { term: 'secret', weight: 5 },
      { term: 'discover', weight: 5 },
      { term: 'hidden', weight: 4 },
      { term: 'explore', weight: 4 },
      { term: 'lore', weight: 4 },
      { term: 'mystery', weight: 4 },
      { term: 'emergent', weight: 3 },
      { term: 'world', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'linear', weight: -3 },
      { term: 'guided', weight: -2 },
      { term: 'tutorial', weight: -1 },
      { term: 'simple', weight: -2 },
    ],

    gameExamples: [
      'Outer Wilds',
      'Disco Elysium',
      'Hollow Knight',
      'Dark Souls',
      'Return of the Obra Dinn',
    ],

    designAdvice: [
      'Hide secrets that reward careful observation',
      'Let players discover mechanics organically',
      'Create interconnected lore to piece together',
      'Reward going off the beaten path',
      'Enable player-driven discovery sharing',
    ],
  },
  {
    id: 'socializer',
    name: 'Social Player',
    description:
      'Plays primarily for social interaction. Games are a venue for connection, not the primary focus.',
    size: '~30% of all gamers',

    motivations: [
      'Playing with friends',
      'Meeting new people',
      'Shared experiences',
      'Cooperative achievements',
      'Community participation',
    ],
    frustrationsToAvoid: [
      'Solo-only content',
      'Toxic matchmaking',
      'Friend-punishing mechanics',
      'Skill-gating group content',
      'Voice-chat requirements',
    ],
    valueProportion:
      'Social quality over game quality - will play mediocre games with friends over great solo games',

    sessionBehavior: {
      preferredLength: 'Variable - matches friend availability',
      frequency: 'When friends are available',
      timeOfDay: 'Evenings and weekends',
      interruptibility: 'High - will leave for real-world social',
    },

    spendingBehavior: {
      averageSpend: '$10-30 per game (influenced by friend purchases)',
      triggers: ['Friends playing', 'Group content releases', 'Cosmetics for identity'],
      turnoffs: ['Pay-to-win in groups', 'Solo-only premium content'],
      preferredModels: ['Free-to-play with cosmetics', 'Low barrier premium'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: true,
      competitiveInterest: 'casual',
      storyImportance: 'none',
      replayExpectation: 'High - social context provides variety',
    },

    positiveIndicators: [
      { term: 'coop', weight: 5 },
      { term: 'multiplayer', weight: 5 },
      { term: 'party', weight: 4 },
      { term: 'friend', weight: 4 },
      { term: 'guild', weight: 4 },
      { term: 'share', weight: 3 },
      { term: 'community', weight: 3 },
      { term: 'together', weight: 4 },
    ],
    negativeIndicators: [
      { term: 'solo', weight: -4 },
      { term: 'single player', weight: -4 },
      { term: 'singleplayer', weight: -4 },
      { term: 'offline', weight: -3 },
    ],

    gameExamples: ['Among Us', 'Fall Guys', 'It Takes Two', 'Fortnite', 'Jackbox Party'],

    designAdvice: [
      'Make adding friends frictionless',
      'Design for varied skill levels playing together',
      'Enable spectating and cheering',
      'Create shareable moments',
      'Support drop-in/drop-out play',
    ],
  },
  {
    id: 'competitor',
    name: 'Competitive Player',
    description: 'Thrives on competition and skill-based ranking. Measures success against others.',
    size: '~15% of gamers (but high engagement)',

    motivations: [
      'Ranking up',
      'Proving skill superiority',
      'Improving personal performance',
      'Tournament participation',
      'Recognition and prestige',
    ],
    frustrationsToAvoid: [
      'RNG determining outcomes',
      'Pay-to-win elements',
      'Smurf-friendly systems',
      'Unreliable matchmaking',
      'Lack of skill expression',
    ],
    valueProportion:
      'Fairness and skill expression - will play simple game with good competition over complex casual game',

    sessionBehavior: {
      preferredLength: '1-3 hours (match-based)',
      frequency: 'Daily, multiple sessions',
      timeOfDay: 'Peak hours for matchmaking',
      interruptibility: 'Very low during matches',
    },

    spendingBehavior: {
      averageSpend: '$50-200+ over lifetime of competitive games',
      triggers: ['Competitive passes', 'Prestige cosmetics', 'Performance gear'],
      turnoffs: ['Pay-to-win', 'Cosmetics affecting gameplay'],
      preferredModels: ['Free-to-play competitive + cosmetics', 'Premium esports titles'],
    },

    gamePreferences: {
      complexity: 'high',
      socialRequired: false, // But often team-based
      competitiveInterest: 'serious',
      storyImportance: 'none',
      replayExpectation: 'Infinite - competition never ends',
    },

    positiveIndicators: [
      { term: 'rank', weight: 5 },
      { term: 'competitive', weight: 5 },
      { term: 'skill', weight: 4 },
      { term: 'pvp', weight: 4 },
      { term: 'esport', weight: 4 },
      { term: 'tournament', weight: 4 },
      { term: 'ladder', weight: 4 },
      { term: 'elo', weight: 4 },
    ],
    negativeIndicators: [
      { term: 'casual', weight: -2 },
      { term: 'random', weight: -4 },
      { term: 'rng', weight: -4 },
      { term: 'luck', weight: -3 },
      { term: 'story', weight: -1 },
    ],

    gameExamples: [
      'Counter-Strike',
      'Valorant',
      'League of Legends',
      'Street Fighter',
      'Chess.com',
    ],

    designAdvice: [
      'Ensure skill is primary determinant of outcomes',
      'Provide robust ranked matchmaking',
      'Create clear progression through ranks',
      'Support tournament/competitive modes',
      'Enable replay analysis and improvement',
    ],
  },
  {
    id: 'casual_relaxer',
    name: 'Casual Relaxer',
    description:
      'Plays to unwind and de-stress. Avoids pressure, seeks comfort and low-stakes enjoyment.',
    size: '~35% of all gamers',

    motivations: [
      'Relaxation and stress relief',
      'Low-pressure entertainment',
      'Gentle progression',
      'Cozy atmosphere',
      'Mindless unwinding',
    ],
    frustrationsToAvoid: [
      'Punishing difficulty',
      'Time pressure',
      'Complex decisions',
      'Forced social interaction',
      'Grinding requirements',
    ],
    valueProportion:
      'Comfort over challenge - would rather easy game that relaxes than hard game that engages',

    sessionBehavior: {
      preferredLength: '15-45 minutes',
      frequency: 'Daily short sessions',
      timeOfDay: 'Before bed, during breaks',
      interruptibility: 'High - plays when convenient',
    },

    spendingBehavior: {
      averageSpend: '$5-15 per game',
      triggers: ['Cosmetics/customization', 'Convenience features', 'New content'],
      turnoffs: ['Pay-to-progress', 'Energy systems', 'Aggressive monetization'],
      preferredModels: ['Premium budget titles', 'Gentle F2P'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'light',
      replayExpectation: 'Low - finishes and moves on',
    },

    positiveIndicators: [
      { term: 'casual', weight: 5 },
      { term: 'relax', weight: 5 },
      { term: 'cozy', weight: 5 },
      { term: 'simple', weight: 4 },
      { term: 'easy', weight: 3 },
      { term: 'peaceful', weight: 4 },
      { term: 'calm', weight: 4 },
      { term: 'auto', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'difficult', weight: -4 },
      { term: 'punish', weight: -4 },
      { term: 'competitive', weight: -3 },
      { term: 'hardcore', weight: -4 },
      { term: 'death', weight: -2 },
    ],

    gameExamples: [
      'Stardew Valley',
      'Animal Crossing',
      'Unpacking',
      'PowerWash Simulator',
      'Cookie Clicker',
    ],

    designAdvice: [
      'Remove fail states or make them gentle',
      'Allow progress at any pace',
      'Create cozy, welcoming aesthetics',
      'Support interruptible play',
      'Avoid time-sensitive mechanics',
    ],
  },
  {
    id: 'mobile_commuter',
    name: 'Mobile Commuter',
    description:
      'Plays during transit and downtime. Values instant accessibility and short sessions.',
    size: '~40% of mobile gamers',

    motivations: [
      'Filling dead time',
      'Quick entertainment hits',
      'Portable progress',
      'One-handed play',
      'No commitment required',
    ],
    frustrationsToAvoid: [
      'Long load times',
      'Wifi requirements',
      'Complex controls',
      'Unskippable content',
      'Battery drain',
    ],
    valueProportion:
      'Accessibility over depth - needs instant start, no setup, immediate satisfaction',

    sessionBehavior: {
      preferredLength: '3-10 minutes',
      frequency: 'Multiple times daily',
      timeOfDay: 'Commute times, waiting periods',
      interruptibility: 'Essential - must be interruptible at any moment',
    },

    spendingBehavior: {
      averageSpend: '$0-5 per month',
      triggers: ['Ad removal', 'Time savers', 'Cosmetics'],
      turnoffs: ['Aggressive ads', 'Paywalls', 'Subscription requirements'],
      preferredModels: ['Free with optional ad removal', 'Cheap premium'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: false,
      competitiveInterest: 'casual',
      storyImportance: 'none',
      replayExpectation: 'Infinite - plays same game daily for months',
    },

    positiveIndicators: [
      { term: 'mobile', weight: 5 },
      { term: 'quick', weight: 4 },
      { term: 'casual', weight: 4 },
      { term: 'auto', weight: 4 },
      { term: 'offline', weight: 4 },
      { term: 'portrait', weight: 4 },
      { term: 'simple', weight: 3 },
      { term: 'tap', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'pc', weight: -2 },
      { term: 'console', weight: -2 },
      { term: 'complex', weight: -3 },
      { term: 'controller', weight: -3 },
      { term: 'keyboard', weight: -3 },
    ],

    gameExamples: ['Candy Crush', 'Subway Surfers', 'Wordle', '2048', 'Temple Run'],

    designAdvice: [
      'Design for instant resume',
      'Support one-handed play',
      'Enable offline mode',
      'Keep sessions under 5 minutes',
      'Minimize battery and data usage',
    ],
  },
  {
    id: 'narrative_seeker',
    name: 'Narrative Seeker',
    description:
      'Plays primarily for story and character experiences. Treats games like interactive fiction.',
    size: '~20% of core gamers',

    motivations: [
      'Experiencing great stories',
      'Character development',
      'Emotional journeys',
      'Making meaningful choices',
      'Discussing story with others',
    ],
    frustrationsToAvoid: [
      'Gameplay padding',
      'Story-gameplay disconnect',
      'Shallow characters',
      'Forced grinding between story',
      'Unskippable repetitive content',
    ],
    valueProportion: 'Story over gameplay - will tolerate mediocre gameplay for great narrative',

    sessionBehavior: {
      preferredLength: '2-4 hours',
      frequency: 'When invested, daily until complete',
      timeOfDay: 'Evening immersion sessions',
      interruptibility: 'Low - prefers uninterrupted story flow',
    },

    spendingBehavior: {
      averageSpend: '$30-60 per game',
      triggers: ['Story DLC', 'Character expansions', 'Complete editions'],
      turnoffs: ['Microtransactions in narrative games', 'Gameplay gates'],
      preferredModels: ['Premium', 'Story DLC'],
    },

    gamePreferences: {
      complexity: 'medium',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'essential',
      replayExpectation: 'Moderate - will replay for different choices',
    },

    positiveIndicators: [
      { term: 'story', weight: 5 },
      { term: 'narrative', weight: 5 },
      { term: 'character', weight: 4 },
      { term: 'dialogue', weight: 4 },
      { term: 'choice', weight: 4 },
      { term: 'emotional', weight: 4 },
      { term: 'plot', weight: 4 },
      { term: 'rpg', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'multiplayer', weight: -2 },
      { term: 'competitive', weight: -3 },
      { term: 'grind', weight: -4 },
      { term: 'endless', weight: -3 },
    ],

    gameExamples: [
      'Disco Elysium',
      'Mass Effect',
      'The Witcher 3',
      'Life is Strange',
      'Baldur\'s Gate 3',
    ],

    designAdvice: [
      'Make story the primary driver',
      'Create memorable, complex characters',
      'Ensure player choices feel meaningful',
      'Minimize gameplay padding',
      'Allow story difficulty options',
    ],
  },
]

/**
 * Audience analyzer tool with psychographic profiling
 */
export const audienceAnalyzerTool = new DynamicStructuredTool({
  name: 'audience_analyzer',
  description: `Analyze how well the game design fits target audiences using psychographic profiling.
Returns:
- Fit scores for multiple audience types
- Spending behavior predictions
- Session design compatibility
- Specific recommendations for each audience

Audience types include: Achievement Hunter, Discovery Seeker, Social Player, Competitive Player, Casual Relaxer, Mobile Commuter, Narrative Seeker.`,
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
    targetAudience: z
      .string()
      .optional()
      .describe('Primary target audience (optional - will analyze all if not specified)'),
    platform: z.string().optional().describe('Target platform'),
    sessionLength: z.string().optional().describe('Expected session length'),
    gameGenre: z.string().optional().describe('Game genre'),
    gameDescription: z.string().optional().describe('Overall game description'),
  }),
  func: async ({
    mechanics,
    targetAudience,
    platform,
    sessionLength,
    gameGenre,
    gameDescription,
  }): Promise<string> => {
    try {
      // Build analysis context
      const allText = [
        ...mechanics.map(m => `${m.name} ${m.type} ${m.description || ''}`),
        gameGenre || '',
        gameDescription || '',
        platform || '',
      ]
        .join(' ')
        .toLowerCase()

      // Score each audience profile
      const audienceScores = AUDIENCE_PROFILES.map(profile => {
        let score = 0
        const matchedPositives: string[] = []
        const matchedNegatives: string[] = []

        // Score positive indicators
        for (const indicator of profile.positiveIndicators) {
          if (allText.includes(indicator.term.toLowerCase())) {
            score += indicator.weight
            matchedPositives.push(indicator.term)
          }
        }

        // Score negative indicators
        for (const indicator of profile.negativeIndicators) {
          if (allText.includes(indicator.term.toLowerCase())) {
            score += indicator.weight // Already negative
            matchedNegatives.push(indicator.term)
          }
        }

        // Platform adjustments
        if (platform) {
          const platformLower = platform.toLowerCase()
          if (profile.id === 'mobile_commuter' && !platformLower.includes('mobile')) {
            score -= 10
          }
          if (profile.id === 'mobile_commuter' && platformLower.includes('mobile')) {
            score += 10
          }
          if (profile.id === 'competitor' && platformLower.includes('pc')) {
            score += 5
          }
        }

        // Normalize to 0-100
        const maxPossible = profile.positiveIndicators.reduce((sum, i) => sum + i.weight, 0)
        const normalizedScore = Math.max(
          0,
          Math.min(100, Math.round((score / maxPossible) * 100 + 40))
        )

        return {
          profile,
          score: normalizedScore,
          matchedPositives,
          matchedNegatives,
          compatibility:
            normalizedScore >= 70
              ? 'Excellent'
              : normalizedScore >= 50
                ? 'Good'
                : normalizedScore >= 30
                  ? 'Moderate'
                  : 'Poor',
        }
      })

      // Sort by score
      audienceScores.sort((a, b) => b.score - a.score)

      // Find primary target if specified
      let primaryTarget = audienceScores[0]
      if (targetAudience) {
        const found = audienceScores.find(
          a =>
            a.profile.name.toLowerCase().includes(targetAudience.toLowerCase()) ||
            a.profile.id.toLowerCase().includes(targetAudience.toLowerCase())
        )
        if (found) primaryTarget = found
      }

      // Generate insights
      const insights: string[] = []

      const topAudiences = audienceScores.filter(a => a.score >= 60)
      const poorFits = audienceScores.filter(a => a.score < 30)

      if (topAudiences.length >= 2) {
        insights.push(
          `🎯 Design appeals to multiple audiences: ${topAudiences.map(a => a.profile.name).join(', ')}`
        )
      }

      if (topAudiences.length === 0) {
        insights.push('⚠️ No strong audience fit detected - consider sharpening target audience')
      }

      // Session length analysis
      if (sessionLength) {
        const minutes = parseInt(sessionLength)
        if (!isNaN(minutes)) {
          if (minutes < 10 && primaryTarget.profile.id !== 'mobile_commuter') {
            insights.push('⚠️ Very short sessions may limit engagement depth')
          }
          if (
            minutes > 60 &&
            ['casual_relaxer', 'mobile_commuter'].includes(primaryTarget.profile.id)
          ) {
            insights.push('⚠️ Long sessions may not fit casual/mobile audience preferences')
          }
        }
      }

      // Monetization insights
      const bestMonetization = topAudiences
        .flatMap(a => a.profile.spendingBehavior.preferredModels)
        .reduce(
          (acc, model) => {
            acc[model] = (acc[model] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

      const recommendedModel = Object.entries(bestMonetization)
        .sort((a, b) => b[1] - a[1])
        .map(([model]) => model)

      // Generate specific recommendations
      const recommendations: string[] = []

      if (primaryTarget.score >= 60) {
        recommendations.push(...primaryTarget.profile.designAdvice.slice(0, 3))
      } else {
        recommendations.push('Consider strengthening appeal to your target audience:')
        recommendations.push(...primaryTarget.profile.designAdvice.slice(0, 2))
      }

      // Spending potential
      const spendingEstimate =
        topAudiences.length > 0
          ? topAudiences[0].profile.spendingBehavior.averageSpend
          : 'Variable - audience fit unclear'

      return JSON.stringify({
        success: true,

        primaryAudience: {
          name: primaryTarget.profile.name,
          fitScore: primaryTarget.score,
          compatibility: primaryTarget.compatibility,
          description: primaryTarget.profile.description,
          marketSize: primaryTarget.profile.size,
          positiveMatches: primaryTarget.matchedPositives,
          negativeMatches: primaryTarget.matchedNegatives,
          sessionPreferences: primaryTarget.profile.sessionBehavior,
          spendingBehavior: primaryTarget.profile.spendingBehavior,
          designAdvice: primaryTarget.profile.designAdvice,
          exampleGames: primaryTarget.profile.gameExamples,
        },

        allAudienceScores: audienceScores.map(a => ({
          audience: a.profile.name,
          fitScore: a.score,
          compatibility: a.compatibility,
          keyStrengths: a.matchedPositives.slice(0, 3),
          keyConcerns: a.matchedNegatives.slice(0, 2),
        })),

        topAudiences: topAudiences.map(a => a.profile.name),
        poorFitAudiences: poorFits.map(a => a.profile.name),

        monetizationAnalysis: {
          recommendedModels: recommendedModel.slice(0, 3),
          expectedSpend: spendingEstimate,
          spendingTriggers: topAudiences
            .flatMap(a => a.profile.spendingBehavior.triggers)
            .slice(0, 5),
          spendingTurnoffs: topAudiences
            .flatMap(a => a.profile.spendingBehavior.turnoffs)
            .slice(0, 3),
        },

        insights,
        recommendations,

        sessionDesignGuidance: {
          idealLength: primaryTarget.profile.sessionBehavior.preferredLength,
          frequency: primaryTarget.profile.sessionBehavior.frequency,
          interruptibility: primaryTarget.profile.sessionBehavior.interruptibility,
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Audience analysis failed',
      })
    }
  },
})
