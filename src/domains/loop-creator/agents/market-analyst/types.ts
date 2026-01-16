/**
 * Market Analyst Types
 *
 * Type definitions for the market analysis agent and its tools.
 */

import { MechanicNode, MechanicEdge, GameLoop } from '../../graph/state'

/**
 * Loop data passed to analysis tools
 */
export interface LoopAnalysisInput {
  mechanics: MechanicNode[]
  connections: MechanicEdge[]
  loops: GameLoop[]
  gameGenre: string
  gamePlatform: string
  targetAudience: string
  gameDescription: string
}

/**
 * Archetype identifiers for best-match scoring
 */
export type ArchetypeId = 'disco_elysium' | 'vampire_survivors' | 'counter_strike'

/**
 * Result from matching against an archetype
 * KEY DESIGN: A loop only needs to excel at ONE archetype to be viable
 */
export interface ArchetypeMatch {
  archetype: ArchetypeId
  archetypeName: string
  score: number // 0-100 raw score
  confidence: number // 0-1 how confident this is THE match
  keyPatterns: string[] // Patterns that matched strongly
  weakPatterns: string[] // Where it diverges (not necessarily bad)
  interpretation: string // Expert interpretation
  marketImplication: string // What this means for market positioning
}

/**
 * Reference game scores (hidden from user)
 * DEPRECATED: Use primaryArchetype instead for "one hit is enough" scoring
 */
export interface ReferenceGameScores {
  discoElysium: number // 0-100: Narrative depth, choice impact, skill system
  vampireSurvivors: number // 0-100: Action satisfaction, progression, power fantasy
  counterStrike: number // 0-100: Competitive balance, skill ceiling, team play
}

/**
 * Market size estimation
 */
export interface MarketSizeData {
  tam: string // Total Addressable Market
  sam: string // Serviceable Addressable Market
  relevantSegment: string // Most relevant market segment
  growthRate: string // Year-over-year growth
  confidence: number // 0-1 confidence in estimate
  sources: string[] // Data sources used
}

/**
 * Competitor information
 */
export interface CompetitorData {
  name: string
  genre: string
  platform: string[]
  playerCount?: string
  similarityScore: number // 0-100 how similar to analyzed loop
  strengths: string[]
  weaknesses: string[]
  marketPosition: string
}

/**
 * Audience fit analysis
 */
export interface AudienceFitData {
  targetDemographic: string
  fitScore: number // 0-100
  strengths: string[]
  concerns: string[]
  recommendations: string[]
}

/**
 * Trend analysis
 */
export interface TrendData {
  trend: string
  direction: 'rising' | 'stable' | 'declining'
  relevance: number // 0-100 relevance to the loop
  description: string
  timeframe: string
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  patternName: string
  matchScore: number // 0-100
  description: string
  examples: string[] // Games that use this pattern
  applicability: string
}

/**
 * Steam charts data
 */
export interface SteamChartsData {
  gameName: string
  currentPlayers: number
  peakPlayers: number
  averagePlayers: number
  trend: 'up' | 'stable' | 'down'
  percentChange: number
}

/**
 * Web search result
 */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  relevance: number
}

/**
 * Game database entry
 */
export interface GameDatabaseEntry {
  id: string
  name: string
  genres: string[]
  platforms: string[]
  releaseDate: string
  rating?: number
  summary: string
  similarGames: string[]
}

/**
 * Market momentum signal
 */
export interface MarketMomentumSignal {
  genre: string
  trend: 'rising' | 'stable' | 'declining' | 'emerging'
  momentumScore: number // -100 to +100
  marketTiming: 'optimal' | 'good' | 'saturated' | 'risky'
  competitorDensity: 'low' | 'medium' | 'high' | 'oversaturated'
  topPerformers: string[]
  opportunities: string[]
  risks: string[]
}

/**
 * Social buzz indicator
 */
export interface SocialBuzzIndicator {
  topic: string
  buzzScore: number // 0-100
  sources: string[]
  sentiment: 'positive' | 'negative' | 'mixed'
  viralPotential: 'high' | 'medium' | 'low'
}

/**
 * Rising competitor to watch
 */
export interface RisingCompetitorData {
  game: string
  genre: string[]
  momentumScore: number
  whySuccessful: string
  lessonsToLearn: string[]
  differentiators: string[]
}

/**
 * Complete market analysis report
 */
export interface MarketAnalysisReport {
  // NEW: Primary archetype match (one hit is enough!)
  primaryArchetype?: ArchetypeMatch
  otherArchetypes?: ArchetypeMatch[]
  viabilityVerdict?: 'strong' | 'moderate' | 'niche' | 'unclear'
  viabilityReason?: string

  // Legacy: Reference game scores (kept for backward compatibility)
  referenceScores: ReferenceGameScores

  // NEW: Real-time market signals
  marketMomentum?: {
    overallMomentum: number
    genreAnalysis: MarketMomentumSignal[]
    socialBuzz: SocialBuzzIndicator[]
    risingCompetitors: RisingCompetitorData[]
  }

  // Visible metrics
  marketSize: MarketSizeData
  competitors: CompetitorData[]
  audienceFit: AudienceFitData
  trends: TrendData[]
  patterns: PatternMatch[]

  // Summary
  overallScore: number // 0-100 market viability score
  recommendations: string[]
  risks: string[]
  opportunities: string[]

  // Metadata
  generatedAt: string
  sourcesUsed: string[]
  confidence: number // 0-1 overall confidence
}

/**
 * Agent state for tracking research progress
 */
export interface MarketAnalystState {
  // Research progress flags
  hasSearchedWeb: boolean
  hasSteamData: boolean
  hasGameDbData: boolean
  hasPatternMatches: boolean
  hasReferenceScores: boolean
  hasMarketSize: boolean
  hasAudienceAnalysis: boolean
  hasCompetitorData: boolean
  hasTrendData: boolean
  hasGeneratedReport: boolean

  // Collected data
  webResults: WebSearchResult[]
  steamData: SteamChartsData[]
  gameDbEntries: GameDatabaseEntry[]
  patternMatches: PatternMatch[]
  referenceScores: Partial<ReferenceGameScores>
  marketSize: MarketSizeData | null
  audienceFit: AudienceFitData | null
  competitors: CompetitorData[]
  trends: TrendData[]

  // Final report
  report: MarketAnalysisReport | null

  // Iteration tracking
  iterationCount: number
  maxIterations: number
}

/**
 * Tool result wrapper
 */
export interface ToolResult<T> {
  success: boolean
  data: T | null
  error?: string
  source?: string
}

/**
 * Create initial analyst state
 */
export function createInitialAnalystState(): MarketAnalystState {
  return {
    hasSearchedWeb: false,
    hasSteamData: false,
    hasGameDbData: false,
    hasPatternMatches: false,
    hasReferenceScores: false,
    hasMarketSize: false,
    hasAudienceAnalysis: false,
    hasCompetitorData: false,
    hasTrendData: false,
    hasGeneratedReport: false,

    webResults: [],
    steamData: [],
    gameDbEntries: [],
    patternMatches: [],
    referenceScores: {},
    marketSize: null,
    audienceFit: null,
    competitors: [],
    trends: [],

    report: null,

    iterationCount: 0,
    maxIterations: 15,
  }
}
