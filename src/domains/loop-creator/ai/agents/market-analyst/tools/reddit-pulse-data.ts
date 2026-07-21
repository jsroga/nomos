import { z } from 'zod'
import hotPostsByTopicJson from '../data/hot-posts-by-topic.json'
import subredditDataJson from '../data/subreddit-data.json'

/** Reddit pulse fixture data */
export interface RedditPost {
  title: string
  subreddit: string
  upvotes: number
  commentCount: number
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' | 'discussion'
  url: string
  flair?: string
  topComments: string[]
  mentionedGames: string[]
  age: string
}

/** Subreddit insight */
export interface SubredditPulse {
  subreddit: string
  subscribers: number
  activeUsers: number
  hotTopics: string[]
  dominantSentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  trendingGames: string[]
  commonComplaints: string[]
  praisedFeatures: string[]
}

const redditPostSchema = z.object({
  title: z.string(),
  subreddit: z.string(),
  upvotes: z.number(),
  commentCount: z.number(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed', 'discussion']),
  url: z.string(),
  flair: z.string().optional(),
  topComments: z.array(z.string()),
  mentionedGames: z.array(z.string()),
  age: z.string(),
})

const subredditPulseSchema = z.object({
  subreddit: z.string(),
  subscribers: z.number(),
  activeUsers: z.number(),
  hotTopics: z.array(z.string()),
  dominantSentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  trendingGames: z.array(z.string()),
  commonComplaints: z.array(z.string()),
  praisedFeatures: z.array(z.string()),
})

function parseSubredditData(data: unknown): Record<string, SubredditPulse> {
  return z.record(subredditPulseSchema).parse(data)
}

function parseHotPostsByTopic(data: unknown): Record<string, RedditPost[]> {
  return z.record(z.array(redditPostSchema)).parse(data)
}

export const SUBREDDIT_DATA = parseSubredditData(subredditDataJson)
export const HOT_POSTS_BY_TOPIC = parseHotPostsByTopic(hotPostsByTopicJson)
