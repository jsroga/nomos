import { countOccurrences } from '@/shared/data/count-occurrences'
import { COMPETITOR_DB } from './competitor-finder-data'
import type { CompetitorFinderResponse, DetailedCompetitor } from './competitor-finder-types'

export type ScoredCompetitor = DetailedCompetitor & {
  similarityScore: number
  matchReasons: string[]
}

export interface CompetitorSearchInput {
  genre: string
  mechanics?: string[]
  platform?: string
  analysisDepth?: 'quick' | 'detailed' | 'comprehensive'
  limit?: number
}

function scoreGenreMatch(
  comp: DetailedCompetitor,
  genreLower: string,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const compGenreLower = comp.genre.toLowerCase()

  if (compGenreLower.includes(genreLower) || genreLower.includes(compGenreLower)) {
    score += 50
    reasons.push(`Genre match: ${comp.genre}`)
  }

  const genreWords = genreLower.split(/[\s-]+/)
  const compGenreWords = compGenreLower.split(/[\s-]+/)
  score += genreWords.filter(word => compGenreWords.includes(word)).length * 15

  return { score, reasons }
}

function scoreMechanicsMatch(
  comp: DetailedCompetitor,
  mechanicsLower: string[],
): { score: number; reasons: string[] } {
  const compText = [
    comp.genre,
    ...comp.strengths,
    ...comp.weaknesses,
    comp.coreLoopDuration,
    ...comp.successFactors,
    ...comp.innovationPoints,
  ]
    .join(' ')
    .toLowerCase()

  const mechanicsMatch = mechanicsLower.filter(mechanic => compText.includes(mechanic))
  const reasons =
    mechanicsMatch.length > 0 ? [`Mechanics: ${mechanicsMatch.join(', ')}`] : []

  return { score: mechanicsMatch.length * 10, reasons }
}

function scorePlatformMatch(
  comp: DetailedCompetitor,
  platformLower: string | undefined,
  platformLabel: string | undefined,
): { score: number; reasons: string[] } {
  if (!platformLower) {
    return { score: 0, reasons: [] }
  }

  if (comp.platform.some(entry => entry.toLowerCase().includes(platformLower))) {
    return { score: 10, reasons: [`Platform: ${platformLabel ?? platformLower}`] }
  }

  return { score: 0, reasons: [] }
}

function scoreRecentSuccess(comp: DetailedCompetitor): { score: number; reasons: string[] } {
  if (comp.launchYear >= 2022 && comp.growthTrajectory !== 'declining') {
    return { score: 10, reasons: ['Recent success'] }
  }

  return { score: 0, reasons: [] }
}

function scoreCompetitor(
  comp: DetailedCompetitor,
  genreLower: string,
  mechanicsLower: string[],
  platformLower: string | undefined,
  platformLabel: string | undefined,
): ScoredCompetitor {
  const genre = scoreGenreMatch(comp, genreLower)
  const mechanics = scoreMechanicsMatch(comp, mechanicsLower)
  const platform = scorePlatformMatch(comp, platformLower, platformLabel)
  const recent = scoreRecentSuccess(comp)

  const score = genre.score + mechanics.score + platform.score + recent.score
  const matchReasons = [...genre.reasons, ...mechanics.reasons, ...platform.reasons, ...recent.reasons]

  return {
    ...comp,
    similarityScore: Math.min(100, score),
    matchReasons,
  }
}

function topRepeatedEntries(values: string[], minCount: number, limit: number): string[] {
  const counts = countOccurrences(values)

  return Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .sort((left, right) => right[1] - left[1])
    .map(([value]) => value)
    .slice(0, limit)
}

function buildPricingStrategy(topCompetitors: ScoredCompetitor[]) {
  if (topCompetitors.length === 0) {
    return null
  }

  const hasFreeTier = topCompetitors.some(competitor => competitor.pricePoint.includes('Free'))
  const allBudget = topCompetitors.every(
    competitor => parseFloat(competitor.pricePoint.replace(/[^0-9.]/g, '')) < 15,
  )

  let recommendation = 'Premium pricing acceptable ($20-40)'
  if (hasFreeTier) {
    recommendation = 'F2P model viable in this space'
  } else if (allBudget) {
    recommendation = 'Budget pricing expected (<$15)'
  }

  return {
    averagePrice: topCompetitors.map(competitor => competitor.pricePoint).join(', '),
    monetizationModels: [...new Set(topCompetitors.flatMap(competitor => competitor.monetization))],
    recommendation,
  }
}

function buildLoopBenchmarks(topCompetitors: ScoredCompetitor[]) {
  if (topCompetitors.length === 0) {
    return null
  }

  return {
    coreLoopExamples: topCompetitors.slice(0, 3).map(competitor => ({
      game: competitor.name,
      duration: competitor.coreLoopDuration,
    })),
    sessionLoopExamples: topCompetitors.slice(0, 3).map(competitor => ({
      game: competitor.name,
      duration: competitor.sessionLoopDuration,
    })),
    insight: 'Core loops should complete in 30 seconds to 3 minutes for this genre',
  }
}

function generateCompetitorInsights(topCompetitors: ScoredCompetitor[]): string[] {
  if (topCompetitors.length === 0) {
    return [
      '🌊 Blue ocean opportunity - no direct competitors found',
      '⚠️ Validate market exists - niche may be too small',
    ]
  }

  const insights: string[] = []
  const avgScore =
    topCompetitors.reduce((sum, competitor) => sum + competitor.similarityScore, 0) /
    topCompetitors.length

  if (avgScore > 70) {
    insights.push('🔴 Crowded market - need strong differentiation to stand out')
    insights.push(`💡 Study ${topCompetitors[0].name}'s weaknesses for opportunities`)
  } else if (avgScore > 40) {
    insights.push('🟡 Moderate competition - room for quality entries')
  } else {
    insights.push('🟢 Limited competition - first-mover advantage possible')
  }

  const leader = topCompetitors[0]
  if (leader.marketShare) {
    insights.push(`👑 Market leader: ${leader.name} (${leader.marketShare})`)
  }

  const successFactors = countOccurrences(topCompetitors.flatMap(competitor => competitor.successFactors))
  const topSuccessFactor = Object.entries(successFactors).sort((left, right) => right[1] - left[1])[0]

  if (topSuccessFactor) {
    insights.push(`✅ Key success pattern: "${topSuccessFactor[0]}"`)
  }

  return insights
}

function applyAnalysisDepth(
  response: CompetitorFinderResponse,
  analysisDepth: 'quick' | 'detailed' | 'comprehensive',
  topCompetitors: ScoredCompetitor[],
  pricingStrategy: ReturnType<typeof buildPricingStrategy>,
  loopBenchmarks: ReturnType<typeof buildLoopBenchmarks>,
  marketGaps: string[],
  consensusLessons: string[],
  commonMistakes: string[],
): CompetitorFinderResponse {
  if (analysisDepth === 'quick') {
    response.competitors = topCompetitors.map(competitor => ({
      name: competitor.name,
      similarityScore: competitor.similarityScore,
      strengths: competitor.strengths.slice(0, 2),
      weaknesses: competitor.weaknesses.slice(0, 2),
    }))
    return response
  }

  if (analysisDepth === 'detailed') {
    response.competitors = topCompetitors.map(competitor => ({
      name: competitor.name,
      genre: competitor.genre,
      similarityScore: competitor.similarityScore,
      matchReasons: competitor.matchReasons,
      playerCount: competitor.playerCount,
      pricePoint: competitor.pricePoint,
      strengths: competitor.strengths,
      weaknesses: competitor.weaknesses,
      coreLoopDuration: competitor.coreLoopDuration,
      successFactors: competitor.successFactors.slice(0, 3),
      designLessons: competitor.designLessons.slice(0, 2),
    }))
    response.pricingStrategy = pricingStrategy
    response.marketGaps = marketGaps.slice(0, 3)
    return response
  }

  response.competitors = topCompetitors
  response.pricingStrategy = pricingStrategy
  response.loopBenchmarks = loopBenchmarks
  response.marketGaps = marketGaps
  response.consensusLessons = consensusLessons
  response.mistakesToAvoid = commonMistakes
  return response
}

export function analyzeCompetitors(input: CompetitorSearchInput): CompetitorFinderResponse {
  const {
    genre,
    mechanics,
    platform,
    analysisDepth = 'detailed',
    limit = 5,
  } = input

  const genreLower = genre.toLowerCase()
  const mechanicsLower = (mechanics ?? []).map(mechanic => mechanic.toLowerCase())
  const platformLower = platform?.toLowerCase()

  const topCompetitors = COMPETITOR_DB.map(competitor =>
    scoreCompetitor(competitor, genreLower, mechanicsLower, platformLower, platform),
  )
    .filter(competitor => competitor.similarityScore > 20)
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, limit)

  const consensusLessons = topRepeatedEntries(
    topCompetitors.flatMap(competitor => competitor.designLessons),
    2,
    5,
  )
  const commonMistakes = topRepeatedEntries(
    topCompetitors.flatMap(competitor => competitor.avoidMistakes),
    1,
    3,
  )
  const marketGaps = topRepeatedEntries(
    topCompetitors.flatMap(competitor => competitor.weaknesses),
    2,
    10,
  )

  const pricingStrategy = buildPricingStrategy(topCompetitors)
  const loopBenchmarks = buildLoopBenchmarks(topCompetitors)
  const insights = generateCompetitorInsights(topCompetitors)

  const response: CompetitorFinderResponse = {
    success: true,
    searchCriteria: {
      genre,
      mechanics: (mechanics ?? []).join(', '),
      platform: platform ?? 'all',
    },
    competitorCount: topCompetitors.length,
    marketDensity:
      topCompetitors.length > 3 ? 'High' : topCompetitors.length > 1 ? 'Medium' : 'Low',
    insights,
  }

  return applyAnalysisDepth(
    response,
    analysisDepth,
    topCompetitors,
    pricingStrategy,
    loopBenchmarks,
    marketGaps,
    consensusLessons,
    commonMistakes,
  )
}
