import type { AudienceProfile } from './audience-analyzer-types'

export const AUDIENCE_PROFILES_EXTENDED: AudienceProfile[] = [
  {
    id: 'casual_relaxer',
    name: 'Casual Relaxer',
    description:
      'Plays to unwind and de-stress. Avoids pressure, seeks comfort and low-stakes enjoyment.',
    size: '~35% of all gamers',

    motivations: [
      'Relaxation and stress relief',
      'Low-pressure entertainment',
      'Gentle progression',
      'Cozy atmosphere',
      'Mindless unwinding',
    ],
    frustrationsToAvoid: [
      'Punishing difficulty',
      'Time pressure',
      'Complex decisions',
      'Forced social interaction',
      'Grinding requirements',
    ],
    valueProportion:
      'Comfort over challenge - would rather easy game that relaxes than hard game that engages',

    sessionBehavior: {
      preferredLength: '15-45 minutes',
      frequency: 'Daily short sessions',
      timeOfDay: 'Before bed, during breaks',
      interruptibility: 'High - plays when convenient',
    },

    spendingBehavior: {
      averageSpend: '$5-15 per game',
      triggers: ['Cosmetics/customization', 'Convenience features', 'New content'],
      turnoffs: ['Pay-to-progress', 'Energy systems', 'Aggressive monetization'],
      preferredModels: ['Premium budget titles', 'Gentle F2P'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'light',
      replayExpectation: 'Low - finishes and moves on',
    },

    positiveIndicators: [
      { term: 'casual', weight: 5 },
      { term: 'relax', weight: 5 },
      { term: 'cozy', weight: 5 },
      { term: 'simple', weight: 4 },
      { term: 'easy', weight: 3 },
      { term: 'peaceful', weight: 4 },
      { term: 'calm', weight: 4 },
      { term: 'auto', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'difficult', weight: -4 },
      { term: 'punish', weight: -4 },
      { term: 'competitive', weight: -3 },
      { term: 'hardcore', weight: -4 },
      { term: 'death', weight: -2 },
    ],

    gameExamples: [
      'Stardew Valley',
      'Animal Crossing',
      'Unpacking',
      'PowerWash Simulator',
      'Cookie Clicker',
    ],

    designAdvice: [
      'Remove fail states or make them gentle',
      'Allow progress at any pace',
      'Create cozy, welcoming aesthetics',
      'Support interruptible play',
      'Avoid time-sensitive mechanics',
    ],
  },
  {
    id: 'mobile_commuter',
    name: 'Mobile Commuter',
    description:
      'Plays during transit and downtime. Values instant accessibility and short sessions.',
    size: '~40% of mobile gamers',

    motivations: [
      'Filling dead time',
      'Quick entertainment hits',
      'Portable progress',
      'One-handed play',
      'No commitment required',
    ],
    frustrationsToAvoid: [
      'Long load times',
      'Wifi requirements',
      'Complex controls',
      'Unskippable content',
      'Battery drain',
    ],
    valueProportion:
      'Accessibility over depth - needs instant start, no setup, immediate satisfaction',

    sessionBehavior: {
      preferredLength: '3-10 minutes',
      frequency: 'Multiple times daily',
      timeOfDay: 'Commute times, waiting periods',
      interruptibility: 'Essential - must be interruptible at any moment',
    },

    spendingBehavior: {
      averageSpend: '$0-5 per month',
      triggers: ['Ad removal', 'Time savers', 'Cosmetics'],
      turnoffs: ['Aggressive ads', 'Paywalls', 'Subscription requirements'],
      preferredModels: ['Free with optional ad removal', 'Cheap premium'],
    },

    gamePreferences: {
      complexity: 'low',
      socialRequired: false,
      competitiveInterest: 'casual',
      storyImportance: 'none',
      replayExpectation: 'Infinite - plays same game daily for months',
    },

    positiveIndicators: [
      { term: 'mobile', weight: 5 },
      { term: 'quick', weight: 4 },
      { term: 'casual', weight: 4 },
      { term: 'auto', weight: 4 },
      { term: 'offline', weight: 4 },
      { term: 'portrait', weight: 4 },
      { term: 'simple', weight: 3 },
      { term: 'tap', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'pc', weight: -2 },
      { term: 'console', weight: -2 },
      { term: 'complex', weight: -3 },
      { term: 'controller', weight: -3 },
      { term: 'keyboard', weight: -3 },
    ],

    gameExamples: ['Candy Crush', 'Subway Surfers', 'Wordle', '2048', 'Temple Run'],

    designAdvice: [
      'Design for instant resume',
      'Support one-handed play',
      'Enable offline mode',
      'Keep sessions under 5 minutes',
      'Minimize battery and data usage',
    ],
  },
  {
    id: 'narrative_seeker',
    name: 'Narrative Seeker',
    description:
      'Plays primarily for story and character experiences. Treats games like interactive fiction.',
    size: '~20% of core gamers',

    motivations: [
      'Experiencing great stories',
      'Character development',
      'Emotional journeys',
      'Making meaningful choices',
      'Discussing story with others',
    ],
    frustrationsToAvoid: [
      'Gameplay padding',
      'Story-gameplay disconnect',
      'Shallow characters',
      'Forced grinding between story',
      'Unskippable repetitive content',
    ],
    valueProportion: 'Story over gameplay - will tolerate mediocre gameplay for great narrative',

    sessionBehavior: {
      preferredLength: '2-4 hours',
      frequency: 'When invested, daily until complete',
      timeOfDay: 'Evening immersion sessions',
      interruptibility: 'Low - prefers uninterrupted story flow',
    },

    spendingBehavior: {
      averageSpend: '$30-60 per game',
      triggers: ['Story DLC', 'Character expansions', 'Complete editions'],
      turnoffs: ['Microtransactions in narrative games', 'Gameplay gates'],
      preferredModels: ['Premium', 'Story DLC'],
    },

    gamePreferences: {
      complexity: 'medium',
      socialRequired: false,
      competitiveInterest: 'none',
      storyImportance: 'essential',
      replayExpectation: 'Moderate - will replay for different choices',
    },

    positiveIndicators: [
      { term: 'story', weight: 5 },
      { term: 'narrative', weight: 5 },
      { term: 'character', weight: 4 },
      { term: 'dialogue', weight: 4 },
      { term: 'choice', weight: 4 },
      { term: 'emotional', weight: 4 },
      { term: 'plot', weight: 4 },
      { term: 'rpg', weight: 3 },
    ],
    negativeIndicators: [
      { term: 'multiplayer', weight: -2 },
      { term: 'competitive', weight: -3 },
      { term: 'grind', weight: -4 },
      { term: 'endless', weight: -3 },
    ],

    gameExamples: [
      'Disco Elysium',
      'Mass Effect',
      'The Witcher 3',
      'Life is Strange',
      'Baldur\'s Gate 3',
    ],

    designAdvice: [
      'Make story the primary driver',
      'Create memorable, complex characters',
      'Ensure player choices feel meaningful',
      'Minimize gameplay padding',
      'Allow story difficulty options',
    ],
  },
]
