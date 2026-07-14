import {
  readNumber,
  readRowNumber,
  readRowString,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import type {
  ArchetypeId,
  ArchetypeMatch,
  AudienceFitData,
  CompetitorData,
  MarketAnalysisReport,
  MarketMomentumSignal,
  MarketSizeData,
  PatternMatch,
  ReferenceGameScores,
  RisingCompetitorData,
  SocialBuzzIndicator,
  TrendData,
} from './types'

function parseArchetypeId(value: unknown): ArchetypeId | undefined {
  const raw = readString(value)
  if (raw === 'disco_elysium' || raw === 'vampire_survivors' || raw === 'counter_strike') {
    return raw
  }
  return undefined
}

function parseArchetypeMatch(value: unknown): ArchetypeMatch | undefined {
  const row = recordFromJson(value)
  const archetype = parseArchetypeId(row.archetype)
  const archetypeName = readRowString(row, 'archetypeName')
  const score = readRowNumber(row, 'score')
  const confidence = readRowNumber(row, 'confidence')
  const interpretation = readRowString(row, 'interpretation')
  const marketImplication = readRowString(row, 'marketImplication')
  if (
    !archetype ||
    !archetypeName ||
    score === undefined ||
    confidence === undefined ||
    !interpretation ||
    !marketImplication
  ) {
    return undefined
  }
  return {
    archetype,
    archetypeName,
    score,
    confidence,
    keyPatterns: stringArrayFromJson(row.keyPatterns),
    weakPatterns: stringArrayFromJson(row.weakPatterns),
    interpretation,
    marketImplication,
  }
}

function parseReferenceScores(value: unknown): ReferenceGameScores {
  const row = recordFromJson(value)
  return {
    discoElysium: readRowNumber(row, 'discoElysium') ?? 0,
    vampireSurvivors: readRowNumber(row, 'vampireSurvivors') ?? 0,
    counterStrike: readRowNumber(row, 'counterStrike') ?? 0,
  }
}

function parseMarketMomentumSignal(value: unknown): MarketMomentumSignal | undefined {
  const row = recordFromJson(value)
  const genre = readRowString(row, 'genre')
  const trend = readRowString(row, 'trend')
  const momentumScore = readRowNumber(row, 'momentumScore')
  const marketTiming = readRowString(row, 'marketTiming')
  const competitorDensity = readRowString(row, 'competitorDensity')
  if (
    !genre ||
    (trend !== 'rising' && trend !== 'stable' && trend !== 'declining' && trend !== 'emerging') ||
    momentumScore === undefined ||
    (marketTiming !== 'optimal' &&
      marketTiming !== 'good' &&
      marketTiming !== 'saturated' &&
      marketTiming !== 'risky') ||
    (competitorDensity !== 'low' &&
      competitorDensity !== 'medium' &&
      competitorDensity !== 'high' &&
      competitorDensity !== 'oversaturated')
  ) {
    return undefined
  }
  return {
    genre,
    trend,
    momentumScore,
    marketTiming,
    competitorDensity,
    topPerformers: stringArrayFromJson(row.topPerformers),
    opportunities: stringArrayFromJson(row.opportunities),
    risks: stringArrayFromJson(row.risks),
  }
}

function parseSocialBuzz(value: unknown): SocialBuzzIndicator | undefined {
  const row = recordFromJson(value)
  const topic = readRowString(row, 'topic')
  const buzzScore = readRowNumber(row, 'buzzScore')
  const sentiment = readRowString(row, 'sentiment')
  const viralPotential = readRowString(row, 'viralPotential')
  if (
    !topic ||
    buzzScore === undefined ||
    (sentiment !== 'positive' && sentiment !== 'negative' && sentiment !== 'mixed') ||
    (viralPotential !== 'high' && viralPotential !== 'medium' && viralPotential !== 'low')
  ) {
    return undefined
  }
  return {
    topic,
    buzzScore,
    sources: stringArrayFromJson(row.sources),
    sentiment,
    viralPotential,
  }
}

function parseRisingCompetitor(value: unknown): RisingCompetitorData | undefined {
  const row = recordFromJson(value)
  const game = readRowString(row, 'game')
  const momentumScore = readRowNumber(row, 'momentumScore')
  const whySuccessful = readRowString(row, 'whySuccessful')
  if (!game || momentumScore === undefined || !whySuccessful) return undefined
  return {
    game,
    genre: stringArrayFromJson(row.genre),
    momentumScore,
    whySuccessful,
    lessonsToLearn: stringArrayFromJson(row.lessonsToLearn),
    differentiators: stringArrayFromJson(row.differentiators),
  }
}

function parseMarketMomentum(value: unknown): MarketAnalysisReport['marketMomentum'] {
  const row = recordFromJson(value)
  const overallMomentum = readRowNumber(row, 'overallMomentum')
  if (overallMomentum === undefined) return undefined
  return {
    overallMomentum,
    genreAnalysis: recordArrayFromJson(row.genreAnalysis)
      .map(parseMarketMomentumSignal)
      .filter((entry): entry is MarketMomentumSignal => entry !== undefined),
    socialBuzz: recordArrayFromJson(row.socialBuzz)
      .map(parseSocialBuzz)
      .filter((entry): entry is SocialBuzzIndicator => entry !== undefined),
    risingCompetitors: recordArrayFromJson(row.risingCompetitors)
      .map(parseRisingCompetitor)
      .filter((entry): entry is RisingCompetitorData => entry !== undefined),
  }
}

function parseMarketSize(value: unknown): MarketSizeData {
  const row = recordFromJson(value)
  return {
    tam: readRowString(row, 'tam') ?? '',
    sam: readRowString(row, 'sam') ?? '',
    relevantSegment: readRowString(row, 'relevantSegment') ?? '',
    growthRate: readRowString(row, 'growthRate') ?? '',
    confidence: readRowNumber(row, 'confidence') ?? 0,
    sources: stringArrayFromJson(row.sources),
  }
}

function parseCompetitor(value: unknown): CompetitorData | undefined {
  const row = recordFromJson(value)
  const name = readRowString(row, 'name')
  const genre = readRowString(row, 'genre')
  const similarityScore = readRowNumber(row, 'similarityScore')
  const marketPosition = readRowString(row, 'marketPosition')
  if (!name || !genre || similarityScore === undefined || !marketPosition) return undefined
  return {
    name,
    genre,
    platform: stringArrayFromJson(row.platform),
    playerCount: readRowString(row, 'playerCount'),
    similarityScore,
    strengths: stringArrayFromJson(row.strengths),
    weaknesses: stringArrayFromJson(row.weaknesses),
    marketPosition,
  }
}

function parseAudienceFit(value: unknown): AudienceFitData {
  const row = recordFromJson(value)
  return {
    targetDemographic: readRowString(row, 'targetDemographic') ?? '',
    fitScore: readRowNumber(row, 'fitScore') ?? 0,
    strengths: stringArrayFromJson(row.strengths),
    concerns: stringArrayFromJson(row.concerns),
    recommendations: stringArrayFromJson(row.recommendations),
  }
}

function parseTrend(value: unknown): TrendData | undefined {
  const row = recordFromJson(value)
  const trend = readRowString(row, 'trend')
  const direction = readRowString(row, 'direction')
  const relevance = readRowNumber(row, 'relevance')
  const description = readRowString(row, 'description')
  const timeframe = readRowString(row, 'timeframe')
  if (
    !trend ||
    (direction !== 'rising' && direction !== 'stable' && direction !== 'declining') ||
    relevance === undefined ||
    !description ||
    !timeframe
  ) {
    return undefined
  }
  return { trend, direction, relevance, description, timeframe }
}

function parsePattern(value: unknown): PatternMatch | undefined {
  const row = recordFromJson(value)
  const patternName = readRowString(row, 'patternName')
  const matchScore = readRowNumber(row, 'matchScore')
  const description = readRowString(row, 'description')
  const applicability = readRowString(row, 'applicability')
  if (!patternName || matchScore === undefined || !description || !applicability) return undefined
  return {
    patternName,
    matchScore,
    description,
    examples: stringArrayFromJson(row.examples),
    applicability,
  }
}

function parseViabilityVerdict(
  value: unknown
): MarketAnalysisReport['viabilityVerdict'] | undefined {
  const raw = readString(value)
  if (raw === 'strong' || raw === 'moderate' || raw === 'niche' || raw === 'unclear') {
    return raw
  }
  return undefined
}

export function marketAnalysisReportFromJson(json: string): MarketAnalysisReport | null {
  try {
    const record = recordFromJson(JSON.parse(json))
    const overallScore = readNumber(record.overallScore)
    if (overallScore === undefined) return null

    const primaryArchetype = parseArchetypeMatch(record.primaryArchetype)
    const otherArchetypes = recordArrayFromJson(record.otherArchetypes)
      .map(parseArchetypeMatch)
      .filter((entry): entry is ArchetypeMatch => entry !== undefined)

    return {
      ...(primaryArchetype ? { primaryArchetype } : {}),
      ...(otherArchetypes.length ? { otherArchetypes } : {}),
      viabilityVerdict: parseViabilityVerdict(record.viabilityVerdict),
      viabilityReason: readString(record.viabilityReason),
      referenceScores: parseReferenceScores(record.referenceScores),
      marketMomentum: parseMarketMomentum(record.marketMomentum),
      marketSize: parseMarketSize(record.marketSize),
      competitors: recordArrayFromJson(record.competitors)
        .map(parseCompetitor)
        .filter((entry): entry is CompetitorData => entry !== undefined),
      audienceFit: parseAudienceFit(record.audienceFit),
      trends: recordArrayFromJson(record.trends)
        .map(parseTrend)
        .filter((entry): entry is TrendData => entry !== undefined),
      patterns: recordArrayFromJson(record.patterns)
        .map(parsePattern)
        .filter((entry): entry is PatternMatch => entry !== undefined),
      overallScore,
      recommendations: stringArrayFromJson(record.recommendations),
      risks: stringArrayFromJson(record.risks),
      opportunities: stringArrayFromJson(record.opportunities),
      generatedAt: readString(record.generatedAt) ?? new Date().toISOString(),
      sourcesUsed: stringArrayFromJson(record.sourcesUsed),
      confidence: readNumber(record.confidence) ?? 0,
    }
  } catch {
    return null
  }
}
