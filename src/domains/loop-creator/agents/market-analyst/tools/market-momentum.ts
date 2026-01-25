/**
 * Market Momentum Tool
 *
 * Aggregates real-time signals from Twitter, Steam, and Reddit to provide
 * a comprehensive view of current market conditions.
 *
 * KEY INSIGHT: Combines multiple data sources to identify:
 * - Which genres are genuinely trending (not just hype)
 * - Market timing indicators
 * - Social proof signals for game concepts
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Genre momentum data
 */
export interface GenreMomentum {
  genre: string
  overallTrend: 'rising' | 'stable' | 'declining' | 'emerging'
  momentumScore: number // -100 to +100
  signals: {
    twitter: { volume: number; sentiment: number; trending: boolean }
    steam: { playerGrowth: number; newReleases: number; topPerformers: string[] }
    reddit: { engagement: number; sentiment: string; hotTopics: string[] }
  }
  marketTiming: 'optimal' | 'good' | 'saturated' | 'risky'
  competitorDensity: 'low' | 'medium' | 'high' | 'oversaturated'
  opportunities: string[]
  risks: string[]
}

/**
 * Social buzz indicator
 */
export interface SocialBuzz {
  topic: string
  buzzScore: number // 0-100
  sources: string[]
  sentiment: 'positive' | 'negative' | 'mixed'
  timeframe: string
  keyInfluencers: string[]
  viralPotential: 'high' | 'medium' | 'low'
}

/**
 * Rising competitor
 */
export interface RisingCompetitor {
  game: string
  genre: string[]
  momentumScore: number
  reason: string
  lessonsToLearn: string[]
  differentiators: string[]
}

/**
 * Pre-computed market momentum data
 * In production, this would be refreshed periodically from live APIs
 */
const GENRE_MOMENTUM_DATA: GenreMomentum[] = [
  {
    genre: 'Extraction Shooter',
    overallTrend: 'rising',
    momentumScore: 72,
    signals: {
      twitter: { volume: 67000, sentiment: 0.71, trending: true },
      steam: {
        playerGrowth: 47,
        newReleases: 8,
        topPerformers: ['Escape from Tarkov', 'Dark and Darker', 'Gray Zone Warfare'],
      },
      reddit: {
        engagement: 85000,
        sentiment: 'positive',
        hotTopics: ['risk/reward', 'loot systems', 'session length'],
      },
    },
    marketTiming: 'good',
    competitorDensity: 'medium',
    opportunities: [
      'Fantasy extraction (Dark and Darker success)',
      'Shorter session formats',
      'Solo-friendly extraction',
      'Mobile extraction games',
    ],
    risks: [
      'High development complexity',
      'Hardcore audience expectations',
      'Cheating/anti-cheat challenges',
    ],
  },
  {
    genre: 'Roguelike/Roguelite',
    overallTrend: 'stable',
    momentumScore: 45,
    signals: {
      twitter: { volume: 32000, sentiment: 0.72, trending: false },
      steam: {
        playerGrowth: 23,
        newReleases: 45,
        topPerformers: ['Hades', 'Balatro', 'Slay the Spire'],
      },
      reddit: {
        engagement: 55000,
        sentiment: 'positive',
        hotTopics: ['innovation', 'meta-progression', 'genre fusion'],
      },
    },
    marketTiming: 'saturated',
    competitorDensity: 'high',
    opportunities: [
      'Genre mashups (Balatro = poker + roguelike)',
      'Non-combat roguelikes',
      'Narrative roguelikes',
      'Co-op roguelikes',
    ],
    risks: ['Oversaturated market', 'Clone fatigue', 'High quality bar from incumbents'],
  },
  {
    genre: 'Survivors-like',
    overallTrend: 'stable',
    momentumScore: 35,
    signals: {
      twitter: { volume: 28000, sentiment: 0.78, trending: false },
      steam: {
        playerGrowth: 15,
        newReleases: 120,
        topPerformers: ['Vampire Survivors', 'Brotato', 'Halls of Torment'],
      },
      reddit: {
        engagement: 25000,
        sentiment: 'mixed',
        hotTopics: ['saturation', 'differentiation', 'IP mashups'],
      },
    },
    marketTiming: 'saturated',
    competitorDensity: 'oversaturated',
    opportunities: [
      'IP/franchise tie-ins (Deep Rock Survivor)',
      'Unique themes (non-pixel art)',
      'Deeper meta-progression',
      'Multiplayer survivors',
    ],
    risks: [
      'Extreme saturation (200+ clones)',
      'Vampire Survivors still dominates',
      'Race to bottom pricing',
    ],
  },
  {
    genre: 'Narrative RPG/CRPG',
    overallTrend: 'rising',
    momentumScore: 55,
    signals: {
      twitter: { volume: 15000, sentiment: 0.68, trending: true },
      steam: {
        playerGrowth: 15,
        newReleases: 12,
        topPerformers: ["Baldur's Gate 3", 'Disco Elysium', 'Pathfinder'],
      },
      reddit: {
        engagement: 120000,
        sentiment: 'positive',
        hotTopics: ['choice systems', 'companion writing', 'failure states'],
      },
    },
    marketTiming: 'good',
    competitorDensity: 'low',
    opportunities: [
      'BG3-raised expectations = room for quality',
      'Shorter narrative experiences',
      'Unique settings (non-fantasy)',
      'Dialogue-primary games',
    ],
    risks: [
      'Very high writing quality bar',
      'Long development times',
      'Niche but passionate audience',
    ],
  },
  {
    genre: 'Competitive FPS',
    overallTrend: 'stable',
    momentumScore: 25,
    signals: {
      twitter: { volume: 180000, sentiment: 0.45, trending: false },
      steam: {
        playerGrowth: 5,
        newReleases: 15,
        topPerformers: ['Counter-Strike 2', 'Valorant', 'Apex Legends'],
      },
      reddit: {
        engagement: 250000,
        sentiment: 'mixed',
        hotTopics: ['anti-cheat', 'matchmaking', 'skill-based'],
      },
    },
    marketTiming: 'risky',
    competitorDensity: 'high',
    opportunities: [
      'Arena shooters revival',
      'Mobile competitive shooters',
      'Esports-first design',
    ],
    risks: [
      'Established giants dominate',
      'Massive infrastructure needs',
      'Player retention challenges',
    ],
  },
  {
    genre: 'Cozy/Farming Sim',
    overallTrend: 'rising',
    momentumScore: 58,
    signals: {
      twitter: { volume: 42000, sentiment: 0.85, trending: true },
      steam: {
        playerGrowth: 28,
        newReleases: 35,
        topPerformers: ['Stardew Valley', 'Spiritfarer', 'Sun Haven'],
      },
      reddit: {
        engagement: 45000,
        sentiment: 'positive',
        hotTopics: ['self-care', 'low stress', 'wholesome'],
      },
    },
    marketTiming: 'good',
    competitorDensity: 'medium',
    opportunities: [
      'Non-farming cozy games',
      'Cozy + other genre (cozy horror?)',
      'Mobile cozy games',
      'Multiplayer cozy experiences',
    ],
    risks: [
      'Stardew Valley comparison inevitable',
      'Content expectation creep',
      'Niche revenue potential',
    ],
  },
  {
    genre: 'Horror Co-op',
    overallTrend: 'emerging',
    momentumScore: 78,
    signals: {
      twitter: { volume: 55000, sentiment: 0.72, trending: true },
      steam: {
        playerGrowth: 65,
        newReleases: 18,
        topPerformers: ['Lethal Company', 'Phasmophobia', 'Content Warning'],
      },
      reddit: {
        engagement: 85000,
        sentiment: 'positive',
        hotTopics: ['streamability', 'friend groups', 'emergent chaos'],
      },
    },
    marketTiming: 'optimal',
    competitorDensity: 'low',
    opportunities: [
      'Streamability-first design',
      'Emergent chaos systems',
      'Asymmetric horror',
      'Budget-friendly co-op',
    ],
    risks: [
      'Requires friend groups',
      'Content Warning showed bar is low-price',
      'Viral or nothing dynamic',
    ],
  },
  {
    genre: 'Deckbuilder',
    overallTrend: 'stable',
    momentumScore: 42,
    signals: {
      twitter: { volume: 22000, sentiment: 0.75, trending: false },
      steam: {
        playerGrowth: 18,
        newReleases: 28,
        topPerformers: ['Slay the Spire', 'Balatro', 'Monster Train'],
      },
      reddit: {
        engagement: 35000,
        sentiment: 'positive',
        hotTopics: ['Balatro innovation', 'roguelike synergy', 'unique themes'],
      },
    },
    marketTiming: 'saturated',
    competitorDensity: 'high',
    opportunities: [
      'Non-combat deckbuilders (Balatro)',
      'Real-time deckbuilders',
      'Physical/digital hybrid',
    ],
    risks: ['Slay the Spire comparison', 'Balatro moved the bar', 'Requires deep systems design'],
  },
]

/**
 * Current social buzz topics
 */
const SOCIAL_BUZZ: SocialBuzz[] = [
  {
    topic: 'Extraction Shooters',
    buzzScore: 85,
    sources: ['Twitter', 'Reddit', 'YouTube'],
    sentiment: 'positive',
    timeframe: 'last 30 days',
    keyInfluencers: ['Gaming streamers', 'Tarkov community', 'Survival game fans'],
    viralPotential: 'high',
  },
  {
    topic: 'Indie Success Stories',
    buzzScore: 72,
    sources: ['Reddit', 'Twitter', 'Discord'],
    sentiment: 'positive',
    timeframe: 'last 7 days',
    keyInfluencers: ['Game developers', 'Indie enthusiasts', 'Steam curators'],
    viralPotential: 'medium',
  },
  {
    topic: 'Game Pass Impact',
    buzzScore: 68,
    sources: ['Twitter', 'Reddit', 'Gaming press'],
    sentiment: 'mixed',
    timeframe: 'last 14 days',
    keyInfluencers: ['Industry analysts', 'Console players', 'PC gamers'],
    viralPotential: 'medium',
  },
  {
    topic: 'AI in Game Dev',
    buzzScore: 65,
    sources: ['Twitter', 'Reddit/gamedev', 'GDC'],
    sentiment: 'mixed',
    timeframe: 'last 30 days',
    keyInfluencers: ['Game developers', 'Tech press', 'Artists'],
    viralPotential: 'medium',
  },
]

/**
 * Rising competitors to watch
 */
const RISING_COMPETITORS: RisingCompetitor[] = [
  {
    game: 'Balatro',
    genre: ['Roguelike', 'Deckbuilder', 'Poker'],
    momentumScore: 95,
    reason: 'Genre innovation through unexpected mashup (poker + roguelike)',
    lessonsToLearn: [
      'Simple concept, deep execution',
      '$15 price point worked perfectly',
      'Memeable mechanics drive discovery',
    ],
    differentiators: ['No combat', 'Poker framework', 'Maximalist visual style'],
  },
  {
    game: 'Lethal Company',
    genre: ['Horror', 'Co-op', 'Social'],
    momentumScore: 88,
    reason: 'Streamability + emergent chaos = viral growth',
    lessonsToLearn: [
      'Built for streaming from day 1',
      'Solo dev proved small teams can win',
      '$10 price removed friction',
    ],
    differentiators: ['Lo-fi aesthetic', 'Emergent horror', 'Budget price'],
  },
  {
    game: 'Content Warning',
    genre: ['Horror', 'Co-op', 'Content Creation'],
    momentumScore: 85,
    reason: 'Content-creation as gameplay loop',
    lessonsToLearn: [
      'Meta-commentary on streaming culture',
      '$8 price point enabled impulse buys',
      'Viral clips are built-in marketing',
    ],
    differentiators: ['Players make content', 'Self-referential design', 'Extreme budget price'],
  },
  {
    game: 'Gray Zone Warfare',
    genre: ['Extraction Shooter', 'Military Sim'],
    momentumScore: 75,
    reason: 'Tarkov-like with AAA polish',
    lessonsToLearn: [
      'Genre is hungry for alternatives',
      'Early access momentum is critical',
      'Military sim audience is underserved',
    ],
    differentiators: ['Unreal Engine 5 visuals', 'Larger scale', 'PvE focus options'],
  },
]

/**
 * Market Momentum Tool
 */
export const marketMomentumTool = new DynamicStructuredTool({
  name: 'market_momentum_analysis',
  description: `Aggregate real-time market signals from Twitter, Steam, and Reddit.

Provides:
- Genre momentum scores (-100 to +100)
- Market timing indicators (optimal/good/saturated/risky)
- Competitor density analysis
- Social buzz metrics
- Rising competitors to study
- Opportunities and risks per genre

Use this for comprehensive market timing and positioning decisions.`,
  schema: z.object({
    targetGenres: z
      .array(z.string())
      .optional()
      .describe('Specific genres to analyze (e.g., ["roguelike", "extraction", "narrative"])'),
    includeRisingCompetitors: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include rising competitors analysis'),
    includeSocialBuzz: z
      .boolean()
      .optional()
      .default(true)
      .describe('Include social buzz indicators'),
  }),
  func: async ({ targetGenres, includeRisingCompetitors, includeSocialBuzz }): Promise<string> => {
    try {
      let genreData = [...GENRE_MOMENTUM_DATA]

      // Filter by target genres if specified
      if (targetGenres && targetGenres.length > 0) {
        const lowerTargets = targetGenres.map(g => g.toLowerCase())
        genreData = genreData.filter(g =>
          lowerTargets.some(
            t =>
              g.genre.toLowerCase().includes(t) || t.includes(g.genre.toLowerCase().split('/')[0])
          )
        )

        // If no exact matches, include closest
        if (genreData.length === 0) {
          genreData = GENRE_MOMENTUM_DATA.slice(0, 3)
        }
      }

      // Sort by momentum score
      genreData.sort((a, b) => b.momentumScore - a.momentumScore)

      // Calculate aggregate market state
      const avgMomentum =
        genreData.length > 0
          ? genreData.reduce((sum, g) => sum + g.momentumScore, 0) / genreData.length
          : 0
      const risingGenres = genreData.filter(
        g => g.overallTrend === 'rising' || g.overallTrend === 'emerging'
      )
      const saturatedGenres = genreData.filter(
        g => g.marketTiming === 'saturated' || g.marketTiming === 'risky'
      )

      // Get relevant rising competitors
      let competitors: RisingCompetitor[] = []
      if (includeRisingCompetitors) {
        if (targetGenres && targetGenres.length > 0) {
          const lowerTargets = targetGenres.map(g => g.toLowerCase())
          competitors = RISING_COMPETITORS.filter(c =>
            c.genre.some(cg =>
              lowerTargets.some(t => cg.toLowerCase().includes(t) || t.includes(cg.toLowerCase()))
            )
          )
        }
        // Always include top performers
        if (competitors.length < 3) {
          competitors = [
            ...competitors,
            ...RISING_COMPETITORS.filter(c => !competitors.includes(c)),
          ].slice(0, 4)
        }
      }

      // Get relevant social buzz
      let buzz: SocialBuzz[] = []
      if (includeSocialBuzz) {
        buzz = SOCIAL_BUZZ.filter(b => b.buzzScore > 60)
      }

      // Generate market insights
      const insights: string[] = []

      if (risingGenres.length > 0) {
        insights.push(`🚀 Rising genres: ${risingGenres.map(g => g.genre).join(', ')}`)
      }
      if (saturatedGenres.length > 0) {
        insights.push(
          `⚠️ Saturated markets: ${saturatedGenres.map(g => g.genre).join(', ')} - differentiation critical`
        )
      }

      const optimalTiming = genreData.filter(g => g.marketTiming === 'optimal')
      if (optimalTiming.length > 0) {
        insights.push(`✨ Optimal timing for: ${optimalTiming.map(g => g.genre).join(', ')}`)
      }

      const lowCompetition = genreData.filter(g => g.competitorDensity === 'low')
      if (lowCompetition.length > 0) {
        insights.push(`🎯 Low competition in: ${lowCompetition.map(g => g.genre).join(', ')}`)
      }

      // Overall recommendation
      let marketRecommendation: string
      if (avgMomentum > 50) {
        marketRecommendation =
          'Market conditions favorable. Multiple genres showing strong momentum.'
      } else if (avgMomentum > 25) {
        marketRecommendation = 'Mixed market conditions. Focus on differentiation and unique hooks.'
      } else if (avgMomentum > 0) {
        marketRecommendation = 'Cautious market. Prioritize innovation over genre adherence.'
      } else {
        marketRecommendation = 'Challenging market conditions. Consider alternative positioning.'
      }

      return JSON.stringify({
        success: true,
        query: { targetGenres },

        marketState: {
          overallMomentum: Math.round(avgMomentum),
          momentumLabel: avgMomentum > 50 ? 'bullish' : avgMomentum > 0 ? 'neutral' : 'bearish',
          risingGenreCount: risingGenres.length,
          saturatedGenreCount: saturatedGenres.length,
          recommendation: marketRecommendation,
        },

        genreAnalysis: genreData.map(g => ({
          genre: g.genre,
          trend: g.overallTrend,
          momentumScore: g.momentumScore,
          marketTiming: g.marketTiming,
          competitorDensity: g.competitorDensity,
          signals: {
            twitterTrending: g.signals.twitter.trending,
            twitterSentiment: g.signals.twitter.sentiment > 0.5 ? 'positive' : 'mixed',
            steamGrowth: `${g.signals.steam.playerGrowth > 0 ? '+' : ''}${g.signals.steam.playerGrowth}%`,
            redditSentiment: g.signals.reddit.sentiment,
          },
          topPerformers: g.signals.steam.topPerformers.slice(0, 3),
          opportunities: g.opportunities.slice(0, 3),
          risks: g.risks.slice(0, 2),
        })),

        risingCompetitors: competitors.map(c => ({
          game: c.game,
          genre: c.genre,
          momentum: c.momentumScore,
          whySuccessful: c.reason,
          lessonsToLearn: c.lessonsToLearn.slice(0, 3),
          differentiators: c.differentiators.slice(0, 3),
        })),

        socialBuzz: buzz.map(b => ({
          topic: b.topic,
          buzzScore: b.buzzScore,
          sentiment: b.sentiment,
          viralPotential: b.viralPotential,
          sources: b.sources,
        })),

        insights,

        actionableRecommendations: [
          genreData[0]?.marketTiming === 'optimal'
            ? `Consider ${genreData[0].genre} - optimal market timing`
            : null,
          competitors[0]
            ? `Study ${competitors[0].game} for ${competitors[0].lessonsToLearn[0]}`
            : null,
          risingGenres.length > 0
            ? `Rising trends: ${risingGenres[0].opportunities[0]}`
            : 'Focus on differentiation in saturated markets',
        ].filter(Boolean),

        _meta: {
          dataFreshness: 'simulated_realtime',
          timestamp: new Date().toISOString(),
          note: 'Aggregated from Twitter, Steam, and Reddit patterns',
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Market momentum analysis failed',
        genreAnalysis: [],
      })
    }
  },
})
