import { recordArrayFromJson } from '@/shared/data/json-guards'
import type { TwitterTrendResult } from './twitter-trends'
import { analyzeSentiment } from './twitter-trends-sentiment'
import { buildUrl } from '@/shared/data/url-builder';

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

export function collectTwitterTrendResults(
  topicLower: string,
  includeEmerging: boolean,
  gamingTrendsDatabase: Record<string, TwitterTrendResult[]>,
  emergingTrends: TwitterTrendResult[],
): TwitterTrendResult[] {
  const results: TwitterTrendResult[] = []

  for (const [key, trends] of Object.entries(gamingTrendsDatabase)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      results.push(...trends)
    }
  }

  if (topicLower.includes('cs') || topicLower.includes('counter')) {
    results.push(...(gamingTrendsDatabase.counter_strike || []))
  }
  if (topicLower.includes('vampire') || topicLower.includes('survivor')) {
    results.push(...(gamingTrendsDatabase.vampire_survivors || []))
  }
  if (topicLower.includes('disco') || topicLower.includes('narrative') || topicLower.includes('rpg')) {
    results.push(...(gamingTrendsDatabase.narrative_rpg || []))
  }

  if (includeEmerging) {
    const relevantEmerging = emergingTrends.filter(trend => {
      const trendLower = trend.topic.toLowerCase()
      return (
        trendLower.includes(topicLower) ||
        topicLower.includes(trendLower.split(' ')[0]) ||
        trend.relatedGames.some(game => topicLower.includes(game.toLowerCase().split(' ')[0]))
      )
    })
    results.push(...relevantEmerging)

    if (results.length < 3) {
      results.push(...emergingTrends.filter(trend => trend.isRising).slice(0, 2))
    }
  }

  if (results.length === 0) {
    results.push(...(gamingTrendsDatabase.general || []))
    results.push(...emergingTrends.slice(0, 2))
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
