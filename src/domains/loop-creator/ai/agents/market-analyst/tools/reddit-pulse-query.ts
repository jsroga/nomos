import type { RedditPost, SubredditPulse } from './reddit-pulse'

const TOPIC_MAPPINGS: Record<string, string[]> = {
  roguelike: ['roguelike', 'roguelite'],
  extraction: ['extraction', 'tarkov'],
  narrative: ['narrative', 'rpg', 'story'],
  competitive: ['competitive', 'fps', 'esport', 'cs'],
  survivors: ['survivors', 'vampire', 'auto-battler'],
  indie: ['indie', 'gamedev'],
}

export function findRedditPostsForTopic(
  topicLower: string,
  hotPostsByTopic: Record<string, RedditPost[]>,
): RedditPost[] {
  const results: RedditPost[] = []

  for (const [key, posts] of Object.entries(hotPostsByTopic)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      results.push(...posts)
    }
  }

  for (const [mapped, terms] of Object.entries(TOPIC_MAPPINGS)) {
    if (terms.some(term => topicLower.includes(term))) {
      const mappedPosts = hotPostsByTopic[mapped] || []
      for (const post of mappedPosts) {
        if (!results.some(existing => existing.title === post.title)) {
          results.push(post)
        }
      }
    }
  }

  if (results.length < 3) {
    results.push(...(hotPostsByTopic.indie || []))
  }

  return results
}

export function gatherSubredditPulseForTopic(
  topicLower: string,
  subreddits: string[] | undefined,
  subredditData: Record<string, SubredditPulse>,
): { relevantSubreddits: SubredditPulse[]; targetSubs: string[] } {
  const relevantSubreddits: SubredditPulse[] = []
  const targetSubs = subreddits || ['r/gaming', 'r/gamedev', 'r/IndieGaming', 'r/Games']

  for (const sub of targetSubs) {
    const subData = subredditData[sub] || subredditData['r/gaming']
    if (subData && !relevantSubreddits.some(entry => entry.subreddit === subData.subreddit)) {
      relevantSubreddits.push(subData)
    }
  }

  if (topicLower.includes('roguelike') || topicLower.includes('roguelite')) {
    const roguelikeSub = subredditData['r/roguelikes']
    if (roguelikeSub && !relevantSubreddits.some(entry => entry.subreddit === roguelikeSub.subreddit)) {
      relevantSubreddits.push(roguelikeSub)
    }
  }

  return { relevantSubreddits, targetSubs }
}

export function filterRedditPostsBySentiment(
  posts: RedditPost[],
  sentimentFilter: string | undefined,
): RedditPost[] {
  if (!sentimentFilter || sentimentFilter === 'all') {
    return posts
  }
  return posts.filter(post => post.sentiment === sentimentFilter)
}

export function buildRedditPulseInsights(
  totalUpvotes: number,
  sentimentCounts: Record<string, number>,
  mentionedGameCount: number,
): string[] {
  return [
    totalUpvotes > 10000 ? '🔥 High engagement on this topic' : '📊 Moderate discussion activity',
    (sentimentCounts.positive ?? 0) > (sentimentCounts.negative ?? 0)
      ? '😊 Generally positive reception'
      : '⚠️ Mixed or negative sentiment',
    mentionedGameCount > 5 ? '🎮 Active comparison to multiple games' : '🎯 Focused discussion',
  ]
}
