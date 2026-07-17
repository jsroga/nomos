import type { RedditPost, SubredditPulse } from './reddit-pulse-data'
import { buildRedditPulseInsights } from './reddit-pulse-query'

interface RedditPulseFormatInput {
  topic: string
  targetSubs: string[]
  timeframe: string
  uniquePosts: RedditPost[]
  relevantSubreddits: SubredditPulse[]
  totalUpvotes: number
  sentimentCounts: Record<string, number>
  allMentionedGames: string[]
  allComments: string[]
  apiConfigured: boolean
}

export function formatRedditPulseResult(input: RedditPulseFormatInput): string {
  const {
    topic,
    targetSubs,
    timeframe,
    uniquePosts,
    relevantSubreddits,
    totalUpvotes,
    sentimentCounts,
    allMentionedGames,
    allComments,
    apiConfigured,
  } = input

  const totalComments = uniquePosts.reduce((sum, post) => sum + post.commentCount, 0)

  return JSON.stringify({
    success: true,
    query: { topic, subreddits: targetSubs, timeframe },
    resultCount: uniquePosts.length,
    aggregate: {
      totalEngagement: totalUpvotes + totalComments,
      averageUpvotes:
        uniquePosts.length > 0 ? Math.round(totalUpvotes / uniquePosts.length) : 0,
      sentimentDistribution: sentimentCounts,
      dominantSentiment:
        Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral',
      mostDiscussedGames: allMentionedGames.slice(0, 5),
    },
    posts: uniquePosts.slice(0, 10).map(p => ({
      title: p.title,
      subreddit: p.subreddit,
      upvotes: p.upvotes,
      comments: p.commentCount,
      sentiment: p.sentiment,
      flair: p.flair,
      topComments: p.topComments.slice(0, 2),
      mentionedGames: p.mentionedGames,
      age: p.age,
    })),
    subredditPulse: relevantSubreddits.map(s => ({
      subreddit: s.subreddit,
      subscribers: s.subscribers,
      activeUsers: s.activeUsers,
      hotTopics: s.hotTopics,
      dominantSentiment: s.dominantSentiment,
      trendingGames: s.trendingGames.slice(0, 3),
      commonComplaints: s.commonComplaints.slice(0, 3),
      praisedFeatures: s.praisedFeatures.slice(0, 3),
    })),
    communityInsights: {
      hotTopics: [...new Set(relevantSubreddits.flatMap(s => s.hotTopics))].slice(0, 5),
      commonComplaints: [...new Set(relevantSubreddits.flatMap(s => s.commonComplaints))].slice(
        0,
        5,
      ),
      praisedFeatures: [...new Set(relevantSubreddits.flatMap(s => s.praisedFeatures))].slice(
        0,
        5,
      ),
      sampleComments: allComments.slice(0, 5),
    },
    insights: buildRedditPulseInsights(totalUpvotes, sentimentCounts, allMentionedGames.length),
    _meta: {
      apiUsed: apiConfigured,
      timestamp: new Date().toISOString(),
      note: 'Data based on Reddit patterns. Configure REDDIT_CLIENT_ID/SECRET for live data.',
    },
  })
}

function countSentiments(posts: RedditPost[]): Record<string, number> {
  const sentimentCounts: Record<string, number> = {}
  for (const post of posts) {
    sentimentCounts[post.sentiment] = (sentimentCounts[post.sentiment] || 0) + 1
  }
  return sentimentCounts
}

export function buildRedditPulsePayload(
  topic: string,
  _subreddits: string[] | undefined,
  _sentimentFilter: string | undefined,
  timeframe: string,
  uniquePosts: RedditPost[],
  relevantSubreddits: SubredditPulse[],
  targetSubs: string[],
): string {
  const totalUpvotes = uniquePosts.reduce((sum, post) => sum + post.upvotes, 0)
  const allMentionedGames = [...new Set(uniquePosts.flatMap(post => post.mentionedGames))]
  const allComments = uniquePosts.flatMap(post => post.topComments)
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET

  return formatRedditPulseResult({
    topic,
    targetSubs,
    timeframe,
    uniquePosts,
    relevantSubreddits,
    totalUpvotes,
    sentimentCounts: countSentiments(uniquePosts),
    allMentionedGames,
    allComments,
    apiConfigured: !!(clientId && clientSecret),
  })
}
