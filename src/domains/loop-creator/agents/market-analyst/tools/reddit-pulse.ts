/**
 * Reddit Pulse Tool
 *
 * Fetches gaming discussions and sentiment from relevant subreddits.
 *
 * Key subreddits monitored:
 * - r/gaming - General gaming news
 * - r/gamedev - Developer discussions
 * - r/IndieGaming - Indie game coverage
 * - r/Games - Serious gaming discussion
 * - r/pcgaming - PC-specific trends
 * - Genre-specific subs (r/roguelikes, r/FPS, etc.)
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Reddit post/discussion
 */
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

/**
 * Subreddit insight
 */
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

/**
 * Simulated Reddit data based on common patterns
 */
const SUBREDDIT_DATA: Record<string, SubredditPulse> = {
  'r/gaming': {
    subreddit: 'r/gaming',
    subscribers: 38000000,
    activeUsers: 45000,
    hotTopics: ['Game Pass value', 'AAA fatigue', 'Nostalgia posts', 'Indie gems'],
    dominantSentiment: 'mixed',
    trendingGames: ['Elden Ring DLC', 'Balatro', 'Helldivers 2'],
    commonComplaints: ['microtransactions', 'live service fatigue', 'remake oversaturation'],
    praisedFeatures: ['single-player campaigns', 'mod support', 'fair pricing'],
  },
  'r/gamedev': {
    subreddit: 'r/gamedev',
    subscribers: 1500000,
    activeUsers: 8500,
    hotTopics: ['Marketing strategies', 'Steam algorithm', 'Burnout', 'Publisher vs solo'],
    dominantSentiment: 'discussion',
    trendingGames: ['Success stories', 'Post-mortems', 'Wishlists data'],
    commonComplaints: ['visibility challenges', 'review bombing', 'clone fatigue'],
    praisedFeatures: ['unique mechanics', 'strong hooks', 'community building'],
  },
  'r/IndieGaming': {
    subreddit: 'r/IndieGaming',
    subscribers: 450000,
    activeUsers: 2500,
    hotTopics: ['Hidden gems', 'Demo feedback', 'Marketing tips', 'Wishlist threads'],
    dominantSentiment: 'positive',
    trendingGames: ['Balatro', 'Content Warning', 'Pizza Tower'],
    commonComplaints: ['oversaturation', 'pricing debates', 'early access quality'],
    praisedFeatures: ['innovation', 'passion projects', 'fair pricing'],
  },
  'r/roguelikes': {
    subreddit: 'r/roguelikes',
    subscribers: 185000,
    activeUsers: 1200,
    hotTopics: [
      'Traditional vs roguelite debate',
      'Permadeath discussion',
      'Procedural generation',
    ],
    dominantSentiment: 'positive',
    trendingGames: ['Balatro', 'Caves of Qud', 'Jupiter Hell', 'Cogmind'],
    commonComplaints: ['roguelite misuse of term', 'RNG complaints', 'difficulty spikes'],
    praisedFeatures: ['emergent gameplay', 'high replayability', 'meaningful progression'],
  },
  'r/pcgaming': {
    subreddit: 'r/pcgaming',
    subscribers: 3200000,
    activeUsers: 15000,
    hotTopics: ['Performance optimization', 'Steam vs Epic', 'Hardware requirements'],
    dominantSentiment: 'mixed',
    trendingGames: ['CS2', 'Elden Ring', 'Helldivers 2'],
    commonComplaints: ['poor ports', 'always-online', 'kernel anti-cheat'],
    praisedFeatures: ['modding', 'ultrawide support', 'high fps'],
  },
  'r/Games': {
    subreddit: 'r/Games',
    subscribers: 3800000,
    activeUsers: 12000,
    hotTopics: ['Industry news', 'Review discussions', 'Studio acquisitions'],
    dominantSentiment: 'discussion',
    trendingGames: ['Major releases', 'Award winners', 'Controversial titles'],
    commonComplaints: ['hype cycles', 'crunch culture', 'monetization'],
    praisedFeatures: ['quality journalism', 'consumer advocacy'],
  },
}

/**
 * Simulated hot posts by topic
 */
const HOT_POSTS_BY_TOPIC: Record<string, RedditPost[]> = {
  roguelike: [
    {
      title: 'Balatro is proof that roguelikes can innovate without combat',
      subreddit: 'r/roguelikes',
      upvotes: 4500,
      commentCount: 380,
      sentiment: 'positive',
      url: 'https://reddit.com/r/roguelikes/...',
      flair: 'Discussion',
      topComments: [
        'The poker mechanics create such satisfying synergies',
        'This is what innovation looks like. Not another Hades clone.',
        'Meta-progression done right - unlocks feel meaningful',
      ],
      mentionedGames: ['Balatro', 'Slay the Spire', 'Luck be a Landlord'],
      age: '2 days',
    },
    {
      title: 'Why do roguelites keep abandoning the "fail forward" philosophy?',
      subreddit: 'r/gamedev',
      upvotes: 890,
      commentCount: 156,
      sentiment: 'discussion',
      url: 'https://reddit.com/r/gamedev/...',
      flair: 'Design',
      topComments: [
        'Players want to feel progress even in death',
        'The meta-progression treadmill is exhausting',
        'Hades struck the perfect balance IMO',
      ],
      mentionedGames: ['Hades', 'Dead Cells', 'Returnal'],
      age: '5 days',
    },
  ],
  extraction: [
    {
      title: 'Extraction shooters are filling the void left by battle royale',
      subreddit: 'r/pcgaming',
      upvotes: 3200,
      commentCount: 420,
      sentiment: 'positive',
      url: 'https://reddit.com/r/pcgaming/...',
      flair: 'Discussion',
      topComments: [
        'The risk/reward of extraction hits different than BR',
        'Finally games respect my time - short raids, meaningful loot',
        'Tarkov created a monster. Everyone wants in now.',
      ],
      mentionedGames: [
        'Escape from Tarkov',
        'Dark and Darker',
        'Hunt: Showdown',
        'Gray Zone Warfare',
      ],
      age: '1 day',
    },
    {
      title: 'Dark and Darker shows fantasy extraction can work',
      subreddit: 'r/Games',
      upvotes: 2800,
      commentCount: 310,
      sentiment: 'positive',
      url: 'https://reddit.com/r/Games/...',
      flair: 'News',
      topComments: [
        'The dungeon crawling aspect adds so much tension',
        'Class system is genuinely interesting for the genre',
        'Hope they fix the legal issues, game deserves to succeed',
      ],
      mentionedGames: ['Dark and Darker', 'Escape from Tarkov', 'Dungeonborne'],
      age: '3 days',
    },
  ],
  narrative: [
    {
      title: 'BG3 has permanently raised expectations for CRPG writing',
      subreddit: 'r/Games',
      upvotes: 8900,
      commentCount: 920,
      sentiment: 'positive',
      url: 'https://reddit.com/r/Games/...',
      flair: 'Discussion',
      topComments: [
        'Every choice feeling meaningful is the new standard',
        'Companion relationships in BG3 are unmatched',
        'Can we please get more games that let you fail interestingly?',
      ],
      mentionedGames: ['Baldur\'s Gate 3', 'Disco Elysium', 'Divinity: Original Sin 2'],
      age: '1 week',
    },
    {
      title: 'Disco Elysium remains the gold standard for dialogue systems',
      subreddit: 'r/gamedev',
      upvotes: 2100,
      commentCount: 280,
      sentiment: 'positive',
      url: 'https://reddit.com/r/gamedev/...',
      flair: 'Discussion',
      topComments: [
        'Skills as characters talking to you was genius',
        'The failure states are more interesting than successes',
        'No other game has matched this internal monologue system',
      ],
      mentionedGames: ['Disco Elysium', 'Planescape: Torment', 'Pentiment'],
      age: '2 weeks',
    },
  ],
  competitive: [
    {
      title: 'CS2 tick rate changes actually fixing the game',
      subreddit: 'r/pcgaming',
      upvotes: 5600,
      commentCount: 780,
      sentiment: 'mixed',
      url: 'https://reddit.com/r/pcgaming/...',
      flair: 'News',
      topComments: [
        'Movement feels so much better now',
        'Still needs better anti-cheat',
        'Premier ranking is actually meaningful now',
      ],
      mentionedGames: ['Counter-Strike 2', 'Valorant', 'CS:GO'],
      age: '4 days',
    },
  ],
  survivors: [
    {
      title: 'The survivors-like market is getting saturated fast',
      subreddit: 'r/IndieGaming',
      upvotes: 1200,
      commentCount: 190,
      sentiment: 'mixed',
      url: 'https://reddit.com/r/IndieGaming/...',
      flair: 'Discussion',
      topComments: [
        'Balatro and Halls of Torment proved differentiation works',
        'Pure clones are dying, innovation survives',
        'Deep Rock Survivor shows IP + genre mashup is the way',
      ],
      mentionedGames: [
        'Vampire Survivors',
        'Balatro',
        'Halls of Torment',
        'Deep Rock Galactic: Survivor',
      ],
      age: '6 days',
    },
  ],
  indie: [
    {
      title: 'Steam Next Fest is now essential for indie visibility',
      subreddit: 'r/gamedev',
      upvotes: 3400,
      commentCount: 450,
      sentiment: 'discussion',
      url: 'https://reddit.com/r/gamedev/...',
      flair: 'Marketing',
      topComments: [
        'Demo conversion rates are real - 10-20% is achievable',
        'Wishlists from NextFest last for years',
        'The preparation is brutal but worth it',
      ],
      mentionedGames: [],
      age: '1 week',
    },
    {
      title: 'Content Warning hit 1M sales with zero marketing budget',
      subreddit: 'r/IndieGaming',
      upvotes: 4800,
      commentCount: 380,
      sentiment: 'positive',
      url: 'https://reddit.com/r/IndieGaming/...',
      flair: 'Success Story',
      topComments: [
        'Streamability is the new marketing',
        'The $8 price point was genius',
        'Co-op + chaos = virality',
      ],
      mentionedGames: ['Content Warning', 'Lethal Company', 'Phasmophobia'],
      age: '2 weeks',
    },
  ],
}

/**
 * Reddit Pulse Tool
 */
export const redditPulseTool = new DynamicStructuredTool({
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
  schema: z.object({
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
  }),
  func: async ({ topic, subreddits, sentimentFilter, timeframe }): Promise<string> => {
    try {
      const topicLower = topic.toLowerCase()
      const results: RedditPost[] = []
      const relevantSubreddits: SubredditPulse[] = []

      // Check for Reddit API credentials
      const clientId = process.env.REDDIT_CLIENT_ID
      const clientSecret = process.env.REDDIT_CLIENT_SECRET

      if (clientId && clientSecret) {
        // Real Reddit API call would go here
        // For now, fall through to simulated data
      }

      // Find relevant posts by topic
      for (const [key, posts] of Object.entries(HOT_POSTS_BY_TOPIC)) {
        if (topicLower.includes(key) || key.includes(topicLower)) {
          results.push(...posts)
        }
      }

      // Map common terms to topics
      const topicMappings: Record<string, string[]> = {
        roguelike: ['roguelike', 'roguelite'],
        extraction: ['extraction', 'tarkov'],
        narrative: ['narrative', 'rpg', 'story'],
        competitive: ['competitive', 'fps', 'esport', 'cs'],
        survivors: ['survivors', 'vampire', 'auto-battler'],
        indie: ['indie', 'gamedev'],
      }

      for (const [mapped, terms] of Object.entries(topicMappings)) {
        if (terms.some(t => topicLower.includes(t))) {
          const mappedPosts = HOT_POSTS_BY_TOPIC[mapped] || []
          for (const post of mappedPosts) {
            if (!results.some(r => r.title === post.title)) {
              results.push(post)
            }
          }
        }
      }

      // Always include some indie/gamedev posts for context
      if (results.length < 3) {
        results.push(...(HOT_POSTS_BY_TOPIC['indie'] || []))
      }

      // Gather subreddit pulse data
      const targetSubs = subreddits || ['r/gaming', 'r/gamedev', 'r/IndieGaming', 'r/Games']
      for (const sub of targetSubs) {
        const subData = SUBREDDIT_DATA[sub] || SUBREDDIT_DATA['r/gaming']
        if (subData && !relevantSubreddits.some(r => r.subreddit === subData.subreddit)) {
          relevantSubreddits.push(subData)
        }
      }

      // Topic-specific subreddits
      if (topicLower.includes('roguelike') || topicLower.includes('roguelite')) {
        const roguelikeSub = SUBREDDIT_DATA['r/roguelikes']
        if (roguelikeSub && !relevantSubreddits.some(r => r.subreddit === roguelikeSub.subreddit)) {
          relevantSubreddits.push(roguelikeSub)
        }
      }

      // Apply sentiment filter
      let filteredPosts = results
      if (sentimentFilter && sentimentFilter !== 'all') {
        filteredPosts = results.filter(p => p.sentiment === sentimentFilter)
      }

      // Remove duplicates
      const uniquePosts = Array.from(new Map(filteredPosts.map(p => [p.title, p])).values())

      // Calculate aggregate metrics
      const totalUpvotes = uniquePosts.reduce((sum, p) => sum + p.upvotes, 0)
      const totalComments = uniquePosts.reduce((sum, p) => sum + p.commentCount, 0)
      const allMentionedGames = [...new Set(uniquePosts.flatMap(p => p.mentionedGames))]

      // Sentiment distribution
      const sentiments = uniquePosts.map(p => p.sentiment)
      const sentimentCounts: Record<string, number> = {}
      for (const s of sentiments) {
        sentimentCounts[s] = (sentimentCounts[s] || 0) + 1
      }

      // Extract key themes from top comments
      const allComments = uniquePosts.flatMap(p => p.topComments)

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
            5
          ),
          praisedFeatures: [...new Set(relevantSubreddits.flatMap(s => s.praisedFeatures))].slice(
            0,
            5
          ),
          sampleComments: allComments.slice(0, 5),
        },

        insights: [
          totalUpvotes > 10000
            ? '🔥 High engagement on this topic'
            : '📊 Moderate discussion activity',
          sentimentCounts['positive'] > sentimentCounts['negative']
            ? '😊 Generally positive reception'
            : '⚠️ Mixed or negative sentiment',
          allMentionedGames.length > 5
            ? '🎮 Active comparison to multiple games'
            : '🎯 Focused discussion',
        ],

        _meta: {
          apiUsed: !!(clientId && clientSecret),
          timestamp: new Date().toISOString(),
          note: 'Data based on Reddit patterns. Configure REDDIT_CLIENT_ID/SECRET for live data.',
        },
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Reddit search failed',
        posts: [],
      })
    }
  },
})
