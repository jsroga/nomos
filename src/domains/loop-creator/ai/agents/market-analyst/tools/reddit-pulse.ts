/**
 * Reddit Pulse Tool
 *
 * Fetches gaming discussions and sentiment from relevant subreddits.
 */

import { createLoopStructuredTool } from './structured-tool'
import { z } from 'zod'
import {
  filterRedditPostsBySentiment,
  findRedditPostsForTopic,
  gatherSubredditPulseForTopic,
} from './reddit-pulse-query'
import { HOT_POSTS_BY_TOPIC, SUBREDDIT_DATA } from './reddit-pulse-data'
import { buildRedditPulsePayload } from './reddit-pulse-format'

export type { RedditPost, SubredditPulse } from './reddit-pulse-data'

const redditPulseSchema = z.object({
  topic: z
    .string()
    .describe('Gaming topic to search (e.g., "roguelike", "extraction", "narrative rpg")'),
  subreddits: z
    .array(z.string())
    .optional()
    .describe('Specific subreddits to search (e.g., ["r/gamedev", "r/roguelikes"])'),
  sentimentFilter: z
    .enum(['all', 'positive', 'negative', 'mixed', 'discussion'])
    .optional()
    .describe('Filter posts by sentiment'),
  timeframe: z
    .enum(['day', 'week', 'month'])
    .optional()
    .default('week')
    .describe('Time range for posts'),
})

export const redditPulseTool = createLoopStructuredTool({
  name: 'reddit_gaming_pulse',
  description: `Fetch gaming discussions and community sentiment from Reddit.

Monitors:
- r/gaming, r/Games - General gaming
- r/gamedev - Developer insights
- r/IndieGaming - Indie scene
- r/pcgaming - PC-specific
- Genre-specific subs (r/roguelikes, etc.)

Returns:
- Hot posts with sentiment analysis
- Subreddit pulse data
- Common complaints and praised features
- Trending games in discussions

Use this to understand community sentiment and what players are discussing.`,
  schema: redditPulseSchema,
  func: async input => {
    const { topic, subreddits, sentimentFilter, timeframe } = redditPulseSchema.parse(input)
    try {
      const topicLower = topic.toLowerCase()
      const results = findRedditPostsForTopic(topicLower, HOT_POSTS_BY_TOPIC)
      const { relevantSubreddits, targetSubs } = gatherSubredditPulseForTopic(
        topicLower,
        subreddits,
        SUBREDDIT_DATA,
      )

      const filteredPosts = filterRedditPostsBySentiment(results, sentimentFilter)
      const uniquePosts = Array.from(new Map(filteredPosts.map(post => [post.title, post])).values())

      return buildRedditPulsePayload(
        topic,
        subreddits,
        sentimentFilter,
        timeframe,
        uniquePosts,
        relevantSubreddits,
        targetSubs,
      )
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Reddit search failed',
        posts: [],
      })
    }
  },
})
