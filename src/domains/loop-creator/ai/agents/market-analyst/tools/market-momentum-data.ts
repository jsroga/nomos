import type { GenreMomentum, RisingCompetitor, SocialBuzz } from './market-momentum-types'

export const GENRE_MOMENTUM_DATA: GenreMomentum[] = [
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
        topPerformers: ['Vampire Survivors', 'Balatro', 'Halls of Torment'],
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
        topPerformers: ['Baldur\'s Gate 3', 'Disco Elysium', 'Pathfinder'],
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

export const SOCIAL_BUZZ: SocialBuzz[] = [
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

export const RISING_COMPETITORS: RisingCompetitor[] = [
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
