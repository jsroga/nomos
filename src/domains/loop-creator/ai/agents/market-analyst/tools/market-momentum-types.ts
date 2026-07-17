export interface GenreMomentum {
  genre: string
  overallTrend: 'rising' | 'stable' | 'declining' | 'emerging'
  momentumScore: number
  signals: {
    twitter: { volume: number; sentiment: number; trending: boolean }
    steam: { playerGrowth: number; newReleases: number; topPerformers: string[] }
    reddit: { engagement: number; sentiment: string; hotTopics: string[] }
  }
  marketTiming: 'optimal' | 'good' | 'saturated' | 'risky'
  competitorDensity: 'low' | 'medium' | 'high' | 'oversaturated'
  opportunities: string[]
  risks: string[]
}

export interface SocialBuzz {
  topic: string
  buzzScore: number
  sources: string[]
  sentiment: 'positive' | 'negative' | 'mixed'
  timeframe: string
  keyInfluencers: string[]
  viralPotential: 'high' | 'medium' | 'low'
}

export interface RisingCompetitor {
  game: string
  genre: string[]
  momentumScore: number
  reason: string
  lessonsToLearn: string[]
  differentiators: string[]
}
