import type { MarketAnalysisReport } from '@/domains/loop-creator/server'
import { MarketTrendDirection } from '@/domains/loop-creator/constants/market-analysis'

function parseTrendDirection(value: unknown): MarketTrendDirection {
  if (
    value === MarketTrendDirection.Rising ||
    value === MarketTrendDirection.Stable ||
    value === MarketTrendDirection.Declining
  ) {
    return value
  }
  return MarketTrendDirection.Stable
}

type EagerMarketAnalysis = {
  referenceScores: {
    discoElysiumScore: number
    vampireSurvivorsScore: number
    counterStrikeScore: number
  } | null
  marketSize: {
    tam: string
    sam: string
    relevantSegment: string
    growthRate: string
    confidence: string | number
    sources: string[] | null
  } | null
  audienceFit: {
    targetDemographic: string
    fitScore: number
    strengths: string[] | null
    concerns: string[] | null
    recommendations: string[] | null
  } | null
  competitors: Array<{
    name: string
    genre: string
    platforms: string[] | null
    playerCount: string | null
    similarityScore: number
    strengths: string[] | null
    weaknesses: string[] | null
    marketPosition: string | null
  }> | null
  trends: Array<{
    trendName: string
    direction: string
    relevance: number
    description: string
    timeframe: string | null
  }> | null
  patterns: Array<{
    patternName: string
    matchScore: number
    description: string
    examples: string[] | null
    applicability: string | null
  }> | null
  overallScore: number
  recommendations: string[] | null
  risks: string[] | null
  opportunities: string[] | null
  createdAt: Date
  sourcesUsed: string[] | null
  confidence: string | number
}

export function buildMarketAnalysisReport(analysis: EagerMarketAnalysis): MarketAnalysisReport {
  return {
    referenceScores: analysis.referenceScores
      ? {
          discoElysium: analysis.referenceScores.discoElysiumScore,
          vampireSurvivors: analysis.referenceScores.vampireSurvivorsScore,
          counterStrike: analysis.referenceScores.counterStrikeScore,
        }
      : { discoElysium: 0, vampireSurvivors: 0, counterStrike: 0 },

    marketSize: analysis.marketSize
      ? {
          tam: analysis.marketSize.tam,
          sam: analysis.marketSize.sam,
          relevantSegment: analysis.marketSize.relevantSegment,
          growthRate: analysis.marketSize.growthRate,
          confidence: Number(analysis.marketSize.confidence),
          sources: analysis.marketSize.sources || [],
        }
      : { tam: '', sam: '', relevantSegment: '', growthRate: '', confidence: 0, sources: [] },

    audienceFit: analysis.audienceFit
      ? {
          targetDemographic: analysis.audienceFit.targetDemographic,
          fitScore: analysis.audienceFit.fitScore,
          strengths: analysis.audienceFit.strengths || [],
          concerns: analysis.audienceFit.concerns || [],
          recommendations: analysis.audienceFit.recommendations || [],
        }
      : { targetDemographic: '', fitScore: 0, strengths: [], concerns: [], recommendations: [] },

    competitors: (analysis.competitors || []).map(c => ({
      name: c.name,
      genre: c.genre,
      platform: c.platforms || [],
      playerCount: c.playerCount || undefined,
      similarityScore: c.similarityScore,
      strengths: c.strengths || [],
      weaknesses: c.weaknesses || [],
      marketPosition: c.marketPosition || '',
    })),

    trends: (analysis.trends || []).map(t => ({
      trend: t.trendName,
      direction: parseTrendDirection(t.direction),
      relevance: t.relevance,
      description: t.description,
      timeframe: t.timeframe || '',
    })),

    patterns: (analysis.patterns || []).map(p => ({
      patternName: p.patternName,
      matchScore: p.matchScore,
      description: p.description,
      examples: p.examples || [],
      applicability: p.applicability || '',
    })),

    overallScore: analysis.overallScore,
    recommendations: analysis.recommendations || [],
    risks: analysis.risks || [],
    opportunities: analysis.opportunities || [],
    generatedAt: analysis.createdAt.toISOString(),
    sourcesUsed: analysis.sourcesUsed || [],
    confidence: Number(analysis.confidence),
  }
}
