import { CompetitorData } from '../types'

export interface DetailedCompetitor extends CompetitorData {
  revenue?: string
  pricePoint: string
  monetization: string[]
  launchYear: number
  coreLoopDuration: string
  sessionLoopDuration: string
  metaLoopDescription: string
  successFactors: string[]
  innovationPoints: string[]
  targetEmotions: string[]
  marketShare?: string
  growthTrajectory: 'explosive' | 'steady' | 'declining' | 'stable'
  communitySize: string
  updateFrequency: string
  designLessons: string[]
  avoidMistakes: string[]
}

export interface CompetitorFinderResponse {
  success: true
  searchCriteria: { genre: string; mechanics: string; platform: string }
  competitorCount: number
  marketDensity: 'High' | 'Medium' | 'Low'
  insights: string[]
  competitors?: unknown[]
  pricingStrategy?: {
    averagePrice: string
    monetizationModels: string[]
    recommendation: string
  } | null
  marketGaps?: string[]
  loopBenchmarks?: {
    coreLoopExamples: Array<{ game: string; duration: string }>
    sessionLoopExamples: Array<{ game: string; duration: string }>
    insight: string
  } | null
  consensusLessons?: string[]
  mistakesToAvoid?: string[]
}
