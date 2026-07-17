import {
  GENRE_MOMENTUM_DATA,
  RISING_COMPETITORS,
  SOCIAL_BUZZ,
} from './market-momentum-data'
import type { GenreMomentum, RisingCompetitor, SocialBuzz } from './market-momentum-types'

export interface MarketMomentumInput {
  targetGenres?: string[]
  includeRisingCompetitors?: boolean
  includeSocialBuzz?: boolean
}

interface GenrePartitions {
  rising: GenreMomentum[]
  saturated: GenreMomentum[]
  optimal: GenreMomentum[]
  lowCompetition: GenreMomentum[]
}

function filterGenreData(targetGenres: string[] | undefined): GenreMomentum[] {
  if (!targetGenres || targetGenres.length === 0) {
    return [...GENRE_MOMENTUM_DATA]
  }

  const lowerTargets = targetGenres.map(genre => genre.toLowerCase())
  const filtered = GENRE_MOMENTUM_DATA.filter(entry =>
    lowerTargets.some(
      target =>
        entry.genre.toLowerCase().includes(target) ||
        target.includes(entry.genre.toLowerCase().split('/')[0]),
    ),
  )

  return filtered.length > 0 ? filtered : GENRE_MOMENTUM_DATA.slice(0, 3)
}

function partitionGenreData(genreData: GenreMomentum[]): GenrePartitions {
  return genreData.reduce<GenrePartitions>(
    (partitions, entry) => {
      if (entry.overallTrend === 'rising' || entry.overallTrend === 'emerging') {
        partitions.rising.push(entry)
      }

      if (entry.marketTiming === 'saturated' || entry.marketTiming === 'risky') {
        partitions.saturated.push(entry)
      }

      if (entry.marketTiming === 'optimal') {
        partitions.optimal.push(entry)
      }

      if (entry.competitorDensity === 'low') {
        partitions.lowCompetition.push(entry)
      }

      return partitions
    },
    { rising: [], saturated: [], optimal: [], lowCompetition: [] },
  )
}

function selectRisingCompetitors(
  targetGenres: string[] | undefined,
  includeRisingCompetitors: boolean,
): RisingCompetitor[] {
  if (!includeRisingCompetitors) {
    return []
  }

  let competitors: RisingCompetitor[] = []

  if (targetGenres && targetGenres.length > 0) {
    const lowerTargets = targetGenres.map(genre => genre.toLowerCase())
    competitors = RISING_COMPETITORS.filter(entry =>
      entry.genre.some(competitorGenre =>
        lowerTargets.some(
          target =>
            competitorGenre.toLowerCase().includes(target) ||
            target.includes(competitorGenre.toLowerCase()),
        ),
      ),
    )
  }

  if (competitors.length < 3) {
    const selected = new Set(competitors)
    return [...competitors, ...RISING_COMPETITORS.filter(entry => !selected.has(entry))].slice(
      0,
      4,
    )
  }

  return competitors
}

function selectSocialBuzz(includeSocialBuzz: boolean): SocialBuzz[] {
  if (!includeSocialBuzz) {
    return []
  }

  return SOCIAL_BUZZ.filter(entry => entry.buzzScore > 60)
}

function buildMarketRecommendation(avgMomentum: number): string {
  if (avgMomentum > 50) {
    return 'Market conditions favorable. Multiple genres showing strong momentum.'
  }

  if (avgMomentum > 25) {
    return 'Mixed market conditions. Focus on differentiation and unique hooks.'
  }

  if (avgMomentum > 0) {
    return 'Cautious market. Prioritize innovation over genre adherence.'
  }

  return 'Challenging market conditions. Consider alternative positioning.'
}

function buildMarketInsights(partitions: GenrePartitions): string[] {
  const insights: string[] = []

  if (partitions.rising.length > 0) {
    insights.push(`🚀 Rising genres: ${partitions.rising.map(entry => entry.genre).join(', ')}`)
  }

  if (partitions.saturated.length > 0) {
    insights.push(
      `⚠️ Saturated markets: ${partitions.saturated.map(entry => entry.genre).join(', ')} - differentiation critical`,
    )
  }

  if (partitions.optimal.length > 0) {
    insights.push(`✨ Optimal timing for: ${partitions.optimal.map(entry => entry.genre).join(', ')}`)
  }

  if (partitions.lowCompetition.length > 0) {
    insights.push(
      `🎯 Low competition in: ${partitions.lowCompetition.map(entry => entry.genre).join(', ')}`,
    )
  }

  return insights
}

function buildActionableRecommendations(
  genreData: GenreMomentum[],
  competitors: RisingCompetitor[],
  risingGenres: GenreMomentum[],
) {
  return [
    genreData[0]?.marketTiming === 'optimal'
      ? `Consider ${genreData[0].genre} - optimal market timing`
      : null,
    competitors[0]
      ? `Study ${competitors[0].game} for ${competitors[0].lessonsToLearn[0]}`
      : null,
    risingGenres.length > 0
      ? `Rising trends: ${risingGenres[0].opportunities[0]}`
      : 'Focus on differentiation in saturated markets',
  ].filter(Boolean)
}

export function analyzeMarketMomentum(input: MarketMomentumInput) {
  const { targetGenres, includeRisingCompetitors = true, includeSocialBuzz = true } = input

  const genreData = filterGenreData(targetGenres)
  genreData.sort((left, right) => right.momentumScore - left.momentumScore)

  const avgMomentum =
    genreData.length > 0
      ? genreData.reduce((sum, entry) => sum + entry.momentumScore, 0) / genreData.length
      : 0

  const partitions = partitionGenreData(genreData)
  const competitors = selectRisingCompetitors(targetGenres, includeRisingCompetitors)
  const buzz = selectSocialBuzz(includeSocialBuzz)
  const insights = buildMarketInsights(partitions)

  return {
    success: true as const,
    query: { targetGenres },
    marketState: {
      overallMomentum: Math.round(avgMomentum),
      momentumLabel: avgMomentum > 50 ? 'bullish' : avgMomentum > 0 ? 'neutral' : 'bearish',
      risingGenreCount: partitions.rising.length,
      saturatedGenreCount: partitions.saturated.length,
      recommendation: buildMarketRecommendation(avgMomentum),
    },
    genreAnalysis: genreData.map(entry => ({
      genre: entry.genre,
      trend: entry.overallTrend,
      momentumScore: entry.momentumScore,
      marketTiming: entry.marketTiming,
      competitorDensity: entry.competitorDensity,
      signals: {
        twitterTrending: entry.signals.twitter.trending,
        twitterSentiment: entry.signals.twitter.sentiment > 0.5 ? 'positive' : 'mixed',
        steamGrowth: `${entry.signals.steam.playerGrowth > 0 ? '+' : ''}${entry.signals.steam.playerGrowth}%`,
        redditSentiment: entry.signals.reddit.sentiment,
      },
      topPerformers: entry.signals.steam.topPerformers.slice(0, 3),
      opportunities: entry.opportunities.slice(0, 3),
      risks: entry.risks.slice(0, 2),
    })),
    risingCompetitors: competitors.map(entry => ({
      game: entry.game,
      genre: entry.genre,
      momentum: entry.momentumScore,
      whySuccessful: entry.reason,
      lessonsToLearn: entry.lessonsToLearn.slice(0, 3),
      differentiators: entry.differentiators.slice(0, 3),
    })),
    socialBuzz: buzz.map(entry => ({
      topic: entry.topic,
      buzzScore: entry.buzzScore,
      sentiment: entry.sentiment,
      viralPotential: entry.viralPotential,
      sources: entry.sources,
    })),
    insights,
    actionableRecommendations: buildActionableRecommendations(
      genreData,
      competitors,
      partitions.rising,
    ),
    _meta: {
      dataFreshness: 'simulated_realtime',
      timestamp: new Date().toISOString(),
      note: 'Aggregated from Twitter, Steam, and Reddit patterns',
    },
  }
}
