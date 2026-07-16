import type { MarketAnalysisReport, ReferenceGameScores } from '../types'

export interface ReportGeneratorInput {
  discoElysiumScore: number
  vampireSurvivorsScore: number
  counterStrikeScore: number
  marketSize: {
    tam: string
    sam?: string
    relevantSegment: string
    growthRate: string
  }
  competitors: Array<{
    name: string
    genre: string
    similarityScore: number
    strengths: string[]
    weaknesses: string[]
  }>
  audienceFit: {
    targetDemographic: string
    fitScore: number
    strengths: string[]
    concerns: string[]
  }
  trends?: Array<{
    trend: string
    direction: 'rising' | 'stable' | 'declining'
    relevance: number
  }>
  patterns?: Array<{
    patternName: string
    matchScore: number
  }>
  keyStrengths: string[]
  keyRisks: string[]
  recommendations: string[]
}

export function calculateReportOverallScore(parsed: ReportGeneratorInput): number {
  const scoreComponents = [
    parsed.audienceFit.fitScore * 0.25,
    Math.min(100, (parsed.patterns?.length || 0) * 20) * 0.15,
    (100 - parsed.competitors.length * 10) * 0.15,
    (parsed.trends?.filter(t => t.direction === 'rising').length || 0) * 15 * 0.15,
    30 * 0.3,
  ]

  return Math.min(100, Math.max(0, Math.round(scoreComponents.reduce((sum, score) => sum + score, 0))))
}

export function determineDominantStyle(parsed: ReportGeneratorInput): string {
  if (
    parsed.vampireSurvivorsScore >= Math.max(parsed.discoElysiumScore, parsed.counterStrikeScore)
  ) {
    return 'Action/Roguelike'
  }
  if (parsed.discoElysiumScore >= parsed.counterStrikeScore) {
    return 'Narrative/RPG'
  }
  return 'Competitive/Skill-based'
}

export function buildReportOpportunities(parsed: ReportGeneratorInput): string[] {
  const opportunities: string[] = []

  if ((parsed.trends?.filter(t => t.direction === 'rising').length || 0) >= 2) {
    opportunities.push('Multiple rising trends support this design direction')
  }

  const competitorWeaknesses = parsed.competitors.flatMap(c => c.weaknesses)
  const uniqueWeaknesses = [...new Set(competitorWeaknesses)].slice(0, 3)
  if (uniqueWeaknesses.length > 0) {
    opportunities.push(`Competitor gaps to exploit: ${uniqueWeaknesses.join(', ')}`)
  }

  if (parsed.audienceFit.fitScore >= 60) {
    opportunities.push('Strong audience fit indicates clear market need')
  }

  const growthRate = parsed.marketSize.growthRate
  if (
    growthRate.includes('20') ||
    growthRate.includes('25') ||
    growthRate.includes('85')
  ) {
    opportunities.push(`High market growth (${growthRate}) - good entry timing`)
  }

  return opportunities
}

export function buildReportRisks(parsed: ReportGeneratorInput): string[] {
  const risks: string[] = [...parsed.keyRisks]

  if (parsed.competitors.length >= 4) {
    risks.push('Crowded market - differentiation is essential')
  }

  if (parsed.trends?.some(t => t.direction === 'declining' && t.relevance > 50)) {
    risks.push('Some relevant trends are declining')
  }

  return risks
}

export function buildMarketVerdict(overallScore: number): string {
  if (overallScore >= 70) return '🟢 Strong market opportunity'
  if (overallScore >= 50) return '🟡 Viable with execution focus'
  if (overallScore >= 30) return '🟠 Challenging - needs differentiation'
  return '🔴 High risk - consider pivoting'
}

export function compileMarketAnalysisReport(
  parsed: ReportGeneratorInput,
  overallScore: number,
  opportunities: string[],
  risks: string[],
  referenceScores: ReferenceGameScores,
): MarketAnalysisReport {
  return {
    referenceScores,
    marketSize: {
      tam: parsed.marketSize.tam,
      sam: parsed.marketSize.sam || parsed.marketSize.tam,
      relevantSegment: parsed.marketSize.relevantSegment,
      growthRate: parsed.marketSize.growthRate,
      confidence: 0.75,
      sources: ['Industry reports', 'Steam analytics', 'Market research'],
    },
    competitors: parsed.competitors.map(c => ({
      name: c.name,
      genre: c.genre,
      platform: [],
      similarityScore: c.similarityScore,
      strengths: c.strengths,
      weaknesses: c.weaknesses,
      marketPosition: c.similarityScore > 70 ? 'Direct competitor' : 'Adjacent market',
    })),
    audienceFit: {
      targetDemographic: parsed.audienceFit.targetDemographic,
      fitScore: parsed.audienceFit.fitScore,
      strengths: parsed.audienceFit.strengths,
      concerns: parsed.audienceFit.concerns,
      recommendations: parsed.recommendations.slice(0, 3),
    },
    trends:
      parsed.trends?.map(t => ({
        ...t,
        description: '',
        timeframe: '2024-2025',
      })) || [],
    patterns:
      parsed.patterns?.map(p => ({
        patternName: p.patternName,
        matchScore: p.matchScore,
        description: '',
        examples: [],
        applicability: p.matchScore > 60 ? 'Strong' : 'Moderate',
      })) || [],
    overallScore,
    recommendations: parsed.recommendations,
    risks,
    opportunities,
    generatedAt: new Date().toISOString(),
    sourcesUsed: ['Web research', 'Steam data', 'Game databases', 'Trend analysis'],
    confidence: 0.75,
  }
}
