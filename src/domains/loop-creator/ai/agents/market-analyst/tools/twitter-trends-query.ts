import { recordArrayFromJson } from '@/shared/data/json-guards'
import type { TwitterTrendResult } from './twitter-trends'
import { analyzeSentiment } from './twitter-trends-sentiment'
import { buildUrl } from '@/shared/data/url-builder'

export async function fetchLiveTwitterTrends(
  topic: string,
  bearerToken: string,
): Promise<TwitterTrendResult[]> {
  const response = await fetch(
    buildUrl('https://api.twitter.com/2/tweets/search/recent', {
      query: `${topic} (game OR gaming OR gamedev) -is:retweet lang:en`,
      max_results: 10,
      'tweet.fields': 'public_metrics,created_at',
    }),
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
  )

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  if (!data.data || data.data.length === 0) {
    return []
  }

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

  const allText = tweets.map(tweet => tweet.text).join(' ')
  const { sentiment, score } = analyzeSentiment(allText)

  return [
    {
      topic: `${topic} (live)`,
      tweetVolume: tweets.length * 1000,
      sentiment,
      sentimentScore: score,
      sampleTweets: tweets.slice(0, 3).map(tweet => tweet.text),
      relevanceToGaming: 0.9,
      relatedGames: [],
      isRising: true,
      timeframe: 'last 7 days (live)',
    },
  ]
}

const TOPIC_ALIAS_KEYS: Array<{ keywords: string[]; databaseKey: string }> = [
  { keywords: ['cs', 'counter'], databaseKey: 'counter_strike' },
  { keywords: ['vampire', 'survivor'], databaseKey: 'vampire_survivors' },
  { keywords: ['disco', 'narrative', 'rpg'], databaseKey: 'narrative_rpg' },
]

function topicMatchesKey(topicLower: string, key: string): boolean {
  return topicLower.includes(key) || key.includes(topicLower)
}

function trendsForDatabaseKey(
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
  databaseKey: string,
): TwitterTrendResult[] {
  return gamingTrendsDatabase[databaseKey] ?? []
}

function collectDatabaseMatches(
  topicLower: string,
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
): TwitterTrendResult[] {
  const results: TwitterTrendResult[] = []
  for (const [key, trends] of Object.entries(gamingTrendsDatabase)) {
    if (topicMatchesKey(topicLower, key)) {
      results.push(...trends)
    }
  }
  return results
}

function collectAliasMatches(
  topicLower: string,
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
): TwitterTrendResult[] {
  const results: TwitterTrendResult[] = []
  for (const alias of TOPIC_ALIAS_KEYS) {
    if (alias.keywords.some(keyword => topicLower.includes(keyword))) {
      results.push(...trendsForDatabaseKey(gamingTrendsDatabase, alias.databaseKey))
    }
  }
  return results
}

function isEmergingTrendRelevant(topicLower: string, trend: TwitterTrendResult): boolean {
  const trendLower = trend.topic.toLowerCase()
  const trendHead = trendLower.split(' ')[0]
  if (trendLower.includes(topicLower) || topicLower.includes(trendHead)) {
    return true
  }
  return trend.relatedGames.some(game => topicLower.includes(game.toLowerCase().split(' ')[0]))
}

function collectEmergingMatches(
  topicLower: string,
  includeEmerging: boolean,
  emergingTrends: TwitterTrendResult[],
  existingCount: number,
): TwitterTrendResult[] {
  if (!includeEmerging) {
    return []
  }

  const results = emergingTrends.filter(trend => isEmergingTrendRelevant(topicLower, trend))
  if (existingCount + results.length < 3) {
    results.push(...emergingTrends.filter(trend => trend.isRising).slice(0, 2))
  }
  return results
}

function collectFallbackTrends(
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
  emergingTrends: TwitterTrendResult[],
): TwitterTrendResult[] {
  return [
    ...trendsForDatabaseKey(gamingTrendsDatabase, 'general'),
    ...emergingTrends.slice(0, 2),
  ]
}

export function collectTwitterTrendResults(
  topicLower: string,
  includeEmerging: boolean,
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
  emergingTrends: TwitterTrendResult[],
): TwitterTrendResult[] {
  const databaseAndAlias = [
    ...collectDatabaseMatches(topicLower, gamingTrendsDatabase),
    ...collectAliasMatches(topicLower, gamingTrendsDatabase),
  ]
  const emerging = collectEmergingMatches(
    topicLower,
    includeEmerging,
    emergingTrends,
    databaseAndAlias.length,
  )
  const results = [...databaseAndAlias, ...emerging]

  if (results.length === 0) {
    return collectFallbackTrends(gamingTrendsDatabase, emergingTrends)
  }

  return results
}

export function buildTwitterTrendInsights(
  risingCount: number,
  avgSentiment: number,
  totalVolume: number,
): string[] {
  return [
    risingCount > 0 ? `📈 ${risingCount} rising trends detected` : '📊 Stable discussion patterns',
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
  ]
}
