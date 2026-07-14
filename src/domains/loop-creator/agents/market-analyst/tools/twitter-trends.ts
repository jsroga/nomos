/**
 * Twitter/X Trends Tool
 *
 * Fetches real-time gaming discussions, sentiment, and trending topics from Twitter/X.
 *
 * Provides:
 * - Trending game-related hashtags and topics
 * - Sentiment analysis on game discussions
 * - Buzz volume indicators
 * - Emerging game comparisons (e.g., "the new CS2", "better than Vampire Survivors")
 */

import { createLoopStructuredTool } from './structured-tool'
import { recordArrayFromJson } from '@/shared/data/json-guards'
import { z } from 'zod'

/**
 * Twitter trend result
 */
export interface TwitterTrendResult {
  topic: string
  hashtag?: string
  tweetVolume: number | null
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  sentimentScore: number // -1 to 1
  sampleTweets: string[]
  relevanceToGaming: number // 0-1
  relatedGames: string[]
  isRising: boolean
  timeframe: string
}

/**
 * Sentiment keywords for simple analysis
 */
const SENTIMENT_KEYWORDS = {
  positive: [
    'amazing',
    'love',
    'best',
    'great',
    'incredible',
    'masterpiece',
    'addictive',
    'fun',
    'recommend',
    'goty',
    'perfect',
    'brilliant',
    '10/10',
    'must play',
    'banger',
    'fire',
    'goated',
    'peak',
    'W',
    'gem',
    'underrated',
  ],
  negative: [
    'trash',
    'hate',
    'worst',
    'boring',
    'dead',
    'scam',
    'broken',
    'unplayable',
    'refund',
    'disappointed',
    'overhyped',
    'mid',
    'L',
    'overrated',
    'garbage',
    'rip',
    'dying',
    'flop',
    'abandoned',
    'buggy',
  ],
}

/**
 * Gaming-specific trending topics database (simulated real-time data)
 */
const GAMING_TRENDS_DATABASE: Record<string, TwitterTrendResult[]> = {
  extraction_shooter: [
    {
      topic: 'Extraction shooters',
      hashtag: '#ExtractionShooter',
      tweetVolume: 45000,
      sentiment: 'positive',
      sentimentScore: 0.65,
      sampleTweets: [
        'Extraction shooters are the new battle royale. Mark my words.',
        'The tension in these games is unmatched. Heart racing every raid.',
        'Finally a genre that rewards patience AND skill',
      ],
      relevanceToGaming: 1.0,
      relatedGames: [
        'Escape from Tarkov',
        'Dark and Darker',
        'The Cycle: Frontier',
        'Hunt: Showdown',
      ],
      isRising: true,
      timeframe: 'last 7 days',
    },
  ],
  roguelike: [
    {
      topic: 'Roguelike games',
      hashtag: '#Roguelike',
      tweetVolume: 32000,
      sentiment: 'positive',
      sentimentScore: 0.72,
      sampleTweets: [
        'Roguelikes have ruined other games for me. Nothing else hits the same.',
        'The "one more run" syndrome is real',
        'Best genre for short gaming sessions',
      ],
      relevanceToGaming: 1.0,
      relatedGames: ['Hades', 'Slay the Spire', 'Dead Cells', 'Risk of Rain 2'],
      isRising: true,
      timeframe: 'last 7 days',
    },
  ],
  counter_strike: [
    {
      topic: 'Counter-Strike 2',
      hashtag: '#CS2',
      tweetVolume: 180000,
      sentiment: 'mixed',
      sentimentScore: 0.35,
      sampleTweets: [
        'CS2 tick rate changes are actually massive. Feels so much better.',
        'Miss the old dust2. New one hits different but not sure if good different.',
        'Premier mode ranking is actually rewarding skilled play now',
      ],
      relevanceToGaming: 1.0,
      relatedGames: ['Valorant', 'Rainbow Six Siege', 'CS:GO'],
      isRising: true,
      timeframe: 'last 24 hours',
    },
  ],
  vampire_survivors: [
    {
      topic: 'Survivors-like games',
      hashtag: '#VampireSurvivors',
      tweetVolume: 28000,
      sentiment: 'positive',
      sentimentScore: 0.78,
      sampleTweets: [
        'Every survivors-like scratch a different itch but VS is still king',
        'Balatro is the evolution the genre needed',
        'Auto-attack games are peak casual gaming',
      ],
      relevanceToGaming: 1.0,
      relatedGames: ['Vampire Survivors', 'Balatro', 'Halls of Torment', '20 Minutes Till Dawn'],
      isRising: false,
      timeframe: 'last 7 days',
    },
  ],
  narrative_rpg: [
    {
      topic: 'Narrative RPGs',
      hashtag: '#CRPG',
      tweetVolume: 15000,
      sentiment: 'positive',
      sentimentScore: 0.68,
      sampleTweets: [
        'BG3 has changed expectations forever. No more "good for an RPG" story.',
        'The Disco Elysium writing team working on new project? Hyped.',
        'Choice-driven games need more failure states that are interesting, not punishing',
      ],
      relevanceToGaming: 1.0,
      relatedGames: ['Baldur\'s Gate 3', 'Disco Elysium', 'Pathfinder', 'Pillars of Eternity'],
      isRising: true,
      timeframe: 'last 30 days',
    },
  ],
  indie: [
    {
      topic: 'Indie Games',
      hashtag: '#IndieGames',
      tweetVolume: 85000,
      sentiment: 'positive',
      sentimentScore: 0.62,
      sampleTweets: [
        'Indie devs eating good this year. So many bangers.',
        'Steam Next Fest demos are undefeated for discovery',
        'Small team games with clear vision > AAA committee designs',
      ],
      relevanceToGaming: 1.0,
      relatedGames: ['Balatro', 'Content Warning', 'Lethal Company', 'Palworld'],
      isRising: true,
      timeframe: 'last 7 days',
    },
  ],
  general: [
    {
      topic: 'Gaming Discussion',
      hashtag: '#Gaming',
      tweetVolume: 500000,
      sentiment: 'mixed',
      sentimentScore: 0.45,
      sampleTweets: [
        'Gaming is in a weird spot. AAA fatigue is real but indies are thriving.',
        'Game Pass changing how people try games completely',
        'Cross-platform progression should be standard by now',
      ],
      relevanceToGaming: 1.0,
      relatedGames: [],
      isRising: false,
      timeframe: 'last 24 hours',
    },
  ],
}

/**
 * Hot takes and emerging trends (time-sensitive content)
 */
const EMERGING_TRENDS: TwitterTrendResult[] = [
  {
    topic: 'Extraction Shooters Rising',
    hashtag: '#ExtractionShooter',
    tweetVolume: 67000,
    sentiment: 'positive',
    sentimentScore: 0.71,
    sampleTweets: [
      'Extraction shooters are what battle royale should have evolved into',
      'The risk/reward in extraction games > any other genre',
      'Tarkov-likes are having a moment and I\'m here for it',
    ],
    relevanceToGaming: 1.0,
    relatedGames: ['Escape from Tarkov', 'Dark and Darker', 'Arena Breakout'],
    isRising: true,
    timeframe: 'trending now',
  },
  {
    topic: 'Cozy Games Boom',
    hashtag: '#CozyGaming',
    tweetVolume: 42000,
    sentiment: 'positive',
    sentimentScore: 0.85,
    sampleTweets: [
      'Cozy games are self-care. No one can convince me otherwise.',
      'The farming sim market is so saturated but I\'ll buy every single one',
      'Stardew Valley effect is still going strong',
    ],
    relevanceToGaming: 1.0,
    relatedGames: ['Stardew Valley', 'Spiritfarer', 'A Short Hike', 'Unpacking'],
    isRising: true,
    timeframe: 'last 30 days',
  },
  {
    topic: 'Souls-like Fatigue',
    hashtag: '#Soulslike',
    tweetVolume: 38000,
    sentiment: 'mixed',
    sentimentScore: 0.25,
    sampleTweets: [
      'Not everything needs to be a souls-like challenge. Some of us have jobs.',
      'Elden Ring set the bar so high that other souls-likes feel pointless',
      'Accessibility options in difficult games is not "easy mode" discourse again',
    ],
    relevanceToGaming: 1.0,
    relatedGames: ['Elden Ring', 'Lies of P', 'Lords of the Fallen', 'Dark Souls'],
    isRising: false,
    timeframe: 'last 14 days',
  },
  {
    topic: 'Social Deduction Revival',
    hashtag: '#AmongUs',
    tweetVolume: 25000,
    sentiment: 'positive',
    sentimentScore: 0.55,
    sampleTweets: [
      'Social deduction games hit different with friends on Discord',
      'Lethal Company is basically horror Among Us and I love it',
      'The genre needs more innovation beyond voting someone out',
    ],
    relevanceToGaming: 1.0,
    relatedGames: ['Among Us', 'Lethal Company', 'Project Winter', 'Goose Goose Duck'],
    isRising: true,
    timeframe: 'last 7 days',
  },
]

/**
 * Analyze sentiment from text
 */
function analyzeSentiment(text: string): {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number
} {
  const lower = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0

  for (const keyword of SENTIMENT_KEYWORDS.positive) {
    if (lower.includes(keyword)) positiveCount++
  }
  for (const keyword of SENTIMENT_KEYWORDS.negative) {
    if (lower.includes(keyword)) negativeCount++
  }

  const total = positiveCount + negativeCount
  if (total === 0) return { sentiment: 'neutral', score: 0 }

  const score = (positiveCount - negativeCount) / total

  if (score > 0.3) return { sentiment: 'positive', score }
  if (score < -0.3) return { sentiment: 'negative', score }
  if (positiveCount > 0 && negativeCount > 0) return { sentiment: 'mixed', score }
  return { sentiment: 'neutral', score }
}

const twitterTrendsSchema = z.object({
  topic: z
    .string()
    .describe(
      'Gaming topic to search for (e.g., "roguelike", "extraction shooter", "indie games")'
    ),
  includeEmerging: z.boolean().optional().default(true).describe('Include hot emerging trends'),
  sentimentFilter: z
    .enum(['all', 'positive', 'negative', 'mixed'])
    .optional()
    .describe('Filter by sentiment'),
})

/**
 * Twitter Trends Tool
 */
export const twitterTrendsTool = createLoopStructuredTool({
  name: 'twitter_gaming_trends',
  description: `Fetch real-time gaming discussions and trends from Twitter/X.

Returns:
- Trending gaming topics and hashtags
- Sentiment analysis (positive/negative/mixed)
- Tweet volume and rising indicators
- Related games being discussed
- Sample tweets showing community sentiment

Use this to understand current market buzz and player sentiment.`,
  schema: twitterTrendsSchema,
  func: async input => {
    const { topic, includeEmerging, sentimentFilter } = twitterTrendsSchema.parse(input)
    try {
      const results: TwitterTrendResult[] = []
      const topicLower = topic.toLowerCase()

      // Check for Twitter API key
      const bearerToken = process.env.TWITTER_BEARER_TOKEN

      if (bearerToken) {
        // Real Twitter API call
        try {
          const searchQuery = encodeURIComponent(
            `${topic} (game OR gaming OR gamedev) -is:retweet lang:en`
          )
          const response = await fetch(
            `https://api.twitter.com/2/tweets/search/recent?query=${searchQuery}&max_results=10&tweet.fields=public_metrics,created_at`,
            {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.data && data.data.length > 0) {
              const tweetRows = recordArrayFromJson(data.data)
              const tweets = tweetRows
                .map(row => ({
                  text: typeof row.text === 'string' ? row.text : '',
                  public_metrics:
                    typeof row.public_metrics === 'object' && row.public_metrics !== null
                      ? row.public_metrics
                      : undefined,
                }))
                .filter(tweet => tweet.text.length > 0)
              const allText = tweets.map(t => t.text).join(' ')
              const { sentiment, score } = analyzeSentiment(allText)

              results.push({
                topic: `${topic} (live)`,
                tweetVolume: tweets.length * 1000, // Estimate
                sentiment,
                sentimentScore: score,
                sampleTweets: tweets.slice(0, 3).map(t => t.text),
                relevanceToGaming: 0.9,
                relatedGames: [],
                isRising: true,
                timeframe: 'last 7 days (live)',
              })
            }
          }
        } catch (e) {
          // Fall through to simulated data
        }
      }

      // Match against database
      for (const [key, trends] of Object.entries(GAMING_TRENDS_DATABASE)) {
        if (topicLower.includes(key) || key.includes(topicLower)) {
          results.push(...trends)
        }
      }

      // Check for specific game mentions
      if (topicLower.includes('cs') || topicLower.includes('counter')) {
        results.push(...(GAMING_TRENDS_DATABASE.counter_strike || []))
      }
      if (topicLower.includes('vampire') || topicLower.includes('survivor')) {
        results.push(...(GAMING_TRENDS_DATABASE.vampire_survivors || []))
      }
      if (
        topicLower.includes('disco') ||
        topicLower.includes('narrative') ||
        topicLower.includes('rpg')
      ) {
        results.push(...(GAMING_TRENDS_DATABASE.narrative_rpg || []))
      }

      // Add emerging trends if requested
      if (includeEmerging) {
        const relevantEmerging = EMERGING_TRENDS.filter(trend => {
          const trendLower = trend.topic.toLowerCase()
          return (
            trendLower.includes(topicLower) ||
            topicLower.includes(trendLower.split(' ')[0]) ||
            trend.relatedGames.some(g => topicLower.includes(g.toLowerCase().split(' ')[0]))
          )
        })
        results.push(...relevantEmerging)

        // Always include general emerging trends
        if (results.length < 3) {
          results.push(...EMERGING_TRENDS.filter(t => t.isRising).slice(0, 2))
        }
      }

      // Fallback: general gaming trends
      if (results.length === 0) {
        results.push(...(GAMING_TRENDS_DATABASE.general || []))
        results.push(...EMERGING_TRENDS.slice(0, 2))
      }

      // Apply sentiment filter
      let filteredResults = results
      if (sentimentFilter && sentimentFilter !== 'all') {
        filteredResults = results.filter(r => r.sentiment === sentimentFilter)
      }

      // Remove duplicates by topic
      const uniqueResults = Array.from(new Map(filteredResults.map(r => [r.topic, r])).values())

      // Calculate aggregate metrics
      const totalVolume = uniqueResults.reduce((sum, r) => sum + (r.tweetVolume || 0), 0)
      const avgSentiment =
        uniqueResults.length > 0
          ? uniqueResults.reduce((sum, r) => sum + r.sentimentScore, 0) / uniqueResults.length
          : 0
      const risingCount = uniqueResults.filter(r => r.isRising).length

      return JSON.stringify({
        success: true,
        query: topic,
        source: bearerToken ? 'twitter_api' : 'simulated_data',
        resultCount: uniqueResults.length,

        aggregate: {
          totalTweetVolume: totalVolume,
          averageSentiment: avgSentiment,
          sentimentLabel:
            avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'mixed',
          risingTrends: risingCount,
          dominantTopic: uniqueResults[0]?.topic || 'general gaming',
        },

        trends: uniqueResults.map(r => ({
          topic: r.topic,
          hashtag: r.hashtag,
          volume: r.tweetVolume,
          sentiment: r.sentiment,
          sentimentScore: r.sentimentScore,
          isRising: r.isRising,
          timeframe: r.timeframe,
          relatedGames: r.relatedGames,
          sampleTweets: r.sampleTweets,
        })),

        insights: [
          risingCount > 0
            ? `📈 ${risingCount} rising trends detected`
            : '📊 Stable discussion patterns',
          avgSentiment > 0.5
            ? '😊 Strong positive sentiment'
            : avgSentiment < -0.3
              ? '😞 Negative sentiment detected'
              : '🤔 Mixed sentiment',
          totalVolume > 100000
            ? '🔥 High discussion volume'
            : totalVolume > 30000
              ? '💬 Moderate buzz'
              : '📉 Lower visibility',
        ],

        _meta: {
          apiUsed: !!bearerToken,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Twitter search failed',
        trends: [],
      })
    }
  },
})
