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
export const SUBREDDIT_DATA: Record<string, SubredditPulse> = {
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
    dominantSentiment: 'mixed',
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
    dominantSentiment: 'mixed',
    trendingGames: ['Major releases', 'Award winners', 'Controversial titles'],
    commonComplaints: ['hype cycles', 'crunch culture', 'monetization'],
    praisedFeatures: ['quality journalism', 'consumer advocacy'],
  },
}

/**
 * Simulated hot posts by topic
 */
export const HOT_POSTS_BY_TOPIC: Record<string, RedditPost[]> = {
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
