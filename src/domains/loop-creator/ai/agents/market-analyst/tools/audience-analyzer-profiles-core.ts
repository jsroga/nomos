import type { AudienceProfile } from './audience-analyzer-types'

export const AUDIENCE_PROFILES_CORE: AudienceProfile[] = [
  {
    id: 'achiever',
    name: 'Achievement Hunter',
    description:
      'Motivated by mastery, completion, and visible accomplishment. Loves checklists, unlocks, and 100% completion.',
    size: '~25% of core gamers',

    motivations: [
      'Completing collections',
      'Mastering systems',
      'Earning rare achievements',
      'Visible progress indicators',
      'Being recognized as skilled',
    ],
    frustrationsToAvoid: [
      'Unobtainable achievements',
      'Hidden requirements',
      'RNG-gated completionism',
      'Time-limited exclusives (FOMO)',
      'Progress resets',
    ],
    valueProportion:
      'Depth over breadth - prefers one game fully completed over many partially played',

    sessionBehavior: {
      preferredLength: '1-3 hours',
      frequency: 'Daily when engaged, then moves on',
      timeOfDay: 'Evening focused sessions',
      interruptibility: 'Low - prefers uninterrupted completion sessions',
    },

    spendingBehavior: {
      averageSpend: '$30-60 per game',
      triggers: ['Complete edition sales', 'Achievement-adding DLC', 'Quality of life features'],
      turnoffs: ['Endless content', 'Pay-to-skip', 'Subscription requirements'],
      preferredModels: ['Premium with DLC', 'Complete editions'],
    },

    gamePreferences: {
      complexity: 'medium',
      socialRequired: false,
      competitiveInterest: 'casual',
      storyImportance: 'light',
      replayExpectation: 'Moderate - will replay for achievements',
    },

    positiveIndicators: [
      { term: 'achievement', weight: 5 },
      { term: 'unlock', weight: 4 },
      { term: 'complete', weight: 3 },
      { term: 'collect', weight: 4 },
      { term: 'mastery', weight: 4 },
      { term: 'challenge', weight: 3 },
      { term: 'progress', weight: 3 },
      { term: 'reward', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'random', weight: -3 },
      { term: 'endless', weight: -2 },
      { term: 'roguelike', weight: -1 }, // Mixed - some achievers like it
      { term: 'daily', weight: -2 },
    ],

    gameExamples: [
      'Hollow Knight',
      'Celeste',
      'Hades (for god mode completion)',
      'Enter the Gungeon',
    ],

    designAdvice: [
      'Provide clear progress tracking toward all unlocks',
      'Include optional hard challenges for bragging rights',
      'Make 100% completion difficult but achievable',
      'Show statistics and completion percentages',
      'Avoid RNG-gated achievements',
    ],
  },
  {
    id: 'explorer',
    name: 'Discovery Seeker',
    description:
      'Driven by curiosity and finding hidden content. Loves secrets, lore, and emergent discoveries.',
    size: '~20% of core gamers',

    motivations: [
      'Finding hidden content',
      'Understanding systems deeply',
      'Discovering emergent interactions',
      'Exploring every corner',
      'Sharing discoveries with others',
    ],
    frustrationsToAvoid: [
      'Linear forced paths',
      'Obvious/hand-held content',
      'Shallow systems',
      'Spoiler-heavy communities',
      'Everything explained upfront',
    ],
    valueProportion:
      'Breadth of discovery - prefers games with many secrets over games with obvious content',

    sessionBehavior: {
      preferredLength: '2-4 hours',
      frequency: 'Sporadic but deep when engaged',
      timeOfDay: 'Late evening/night exploration sessions',
      interruptibility: 'Medium - can pause exploration',
    },

    spendingBehavior: {
      averageSpend: '$20-40 per game',
      triggers: ['Mystery DLC', 'Expansion content', 'Lore additions'],
      turnoffs: ['Obvious content reveals', 'Pay-to-reveal', 'Time-gated exploration'],
      preferredModels: ['Premium', 'Expansion packs'],
    },

    gamePreferences: {
      complexity: 'high',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'important',
      replayExpectation: 'High - will replay to find missed content',
    },

    positiveIndicators: [
      { term: 'secret', weight: 5 },
      { term: 'discover', weight: 5 },
      { term: 'hidden', weight: 4 },
      { term: 'explore', weight: 4 },
      { term: 'lore', weight: 4 },
      { term: 'mystery', weight: 4 },
      { term: 'emergent', weight: 3 },
      { term: 'world', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'linear', weight: -3 },
      { term: 'guided', weight: -2 },
      { term: 'tutorial', weight: -1 },
      { term: 'simple', weight: -2 },
    ],

    gameExamples: [
      'Outer Wilds',
      'Disco Elysium',
      'Hollow Knight',
      'Dark Souls',
      'Return of the Obra Dinn',
    ],

    designAdvice: [
      'Hide secrets that reward careful observation',
      'Let players discover mechanics organically',
      'Create interconnected lore to piece together',
      'Reward going off the beaten path',
      'Enable player-driven discovery sharing',
    ],
  },
  {
    id: 'socializer',
    name: 'Social Player',
    description:
      'Plays primarily for social interaction. Games are a venue for connection, not the primary focus.',
    size: '~30% of all gamers',

    motivations: [
      'Playing with friends',
      'Meeting new people',
      'Shared experiences',
      'Cooperative achievements',
      'Community participation',
    ],
    frustrationsToAvoid: [
      'Solo-only content',
      'Toxic matchmaking',
      'Friend-punishing mechanics',
      'Skill-gating group content',
      'Voice-chat requirements',
    ],
    valueProportion:
      'Social quality over game quality - will play mediocre games with friends over great solo games',

    sessionBehavior: {
      preferredLength: 'Variable - matches friend availability',
      frequency: 'When friends are available',
      timeOfDay: 'Evenings and weekends',
      interruptibility: 'High - will leave for real-world social',
    },

    spendingBehavior: {
      averageSpend: '$10-30 per game (influenced by friend purchases)',
      triggers: ['Friends playing', 'Group content releases', 'Cosmetics for identity'],
      turnoffs: ['Pay-to-win in groups', 'Solo-only premium content'],
      preferredModels: ['Free-to-play with cosmetics', 'Low barrier premium'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: true,
      competitiveInterest: 'casual',
      storyImportance: 'none',
      replayExpectation: 'High - social context provides variety',
    },

    positiveIndicators: [
      { term: 'coop', weight: 5 },
      { term: 'multiplayer', weight: 5 },
      { term: 'party', weight: 4 },
      { term: 'friend', weight: 4 },
      { term: 'guild', weight: 4 },
      { term: 'share', weight: 3 },
      { term: 'community', weight: 3 },
      { term: 'together', weight: 4 },
    ],
    negativeIndicators: [
      { term: 'solo', weight: -4 },
      { term: 'single player', weight: -4 },
      { term: 'singleplayer', weight: -4 },
      { term: 'offline', weight: -3 },
    ],

    gameExamples: ['Among Us', 'Fall Guys', 'It Takes Two', 'Fortnite', 'Jackbox Party'],

    designAdvice: [
      'Make adding friends frictionless',
      'Design for varied skill levels playing together',
      'Enable spectating and cheering',
      'Create shareable moments',
      'Support drop-in/drop-out play',
    ],
  },
  {
    id: 'competitor',
    name: 'Competitive Player',
    description: 'Thrives on competition and skill-based ranking. Measures success against others.',
    size: '~15% of gamers (but high engagement)',

    motivations: [
      'Ranking up',
      'Proving skill superiority',
      'Improving personal performance',
      'Tournament participation',
      'Recognition and prestige',
    ],
    frustrationsToAvoid: [
      'RNG determining outcomes',
      'Pay-to-win elements',
      'Smurf-friendly systems',
      'Unreliable matchmaking',
      'Lack of skill expression',
    ],
    valueProportion:
      'Fairness and skill expression - will play simple game with good competition over complex casual game',

    sessionBehavior: {
      preferredLength: '1-3 hours (match-based)',
      frequency: 'Daily, multiple sessions',
      timeOfDay: 'Peak hours for matchmaking',
      interruptibility: 'Very low during matches',
    },

    spendingBehavior: {
      averageSpend: '$50-200+ over lifetime of competitive games',
      triggers: ['Competitive passes', 'Prestige cosmetics', 'Performance gear'],
      turnoffs: ['Pay-to-win', 'Cosmetics affecting gameplay'],
      preferredModels: ['Free-to-play competitive + cosmetics', 'Premium esports titles'],
    },

    gamePreferences: {
      complexity: 'high',
      socialRequired: false, // But often team-based
      competitiveInterest: 'serious',
      storyImportance: 'none',
      replayExpectation: 'Infinite - competition never ends',
    },

    positiveIndicators: [
      { term: 'rank', weight: 5 },
      { term: 'competitive', weight: 5 },
      { term: 'skill', weight: 4 },
      { term: 'pvp', weight: 4 },
      { term: 'esport', weight: 4 },
      { term: 'tournament', weight: 4 },
      { term: 'ladder', weight: 4 },
      { term: 'elo', weight: 4 },
    ],
    negativeIndicators: [
      { term: 'casual', weight: -2 },
      { term: 'random', weight: -4 },
      { term: 'rng', weight: -4 },
      { term: 'luck', weight: -3 },
      { term: 'story', weight: -1 },
    ],

    gameExamples: [
      'Counter-Strike',
      'Valorant',
      'League of Legends',
      'Street Fighter',
      'Chess.com',
    ],

    designAdvice: [
      'Ensure skill is primary determinant of outcomes',
      'Provide robust ranked matchmaking',
      'Create clear progression through ranks',
      'Support tournament/competitive modes',
      'Enable replay analysis and improvement',
    ],
  },
]
