import { GENRE_MARKET_DATA, STEAM_TOP_GAMES } from './steam-trending-data'
import type { GenreMarketData, SteamGameData } from './steam-trending-types'

export interface SteamTrendingInput {
  genre?: string
  includeIndieOnly?: boolean
  limit: number
  sortBy?: 'players' | 'growth' | 'review'
}

interface GameAggregate {
  totalPlayers: number
  avgGrowth: number
  risingCount: number
  indieCount: number
}

function filterSteamGames(input: SteamTrendingInput): SteamGameData[] {
  let games = [...STEAM_TOP_GAMES]

  if (input.genre || input.includeIndieOnly) {
    const genreLower = input.genre?.toLowerCase()
    games = games.filter(game => {
      const genreMatch =
        !genreLower ||
        game.genre.some(entry => entry.toLowerCase().includes(genreLower)) ||
        game.tags.some(tag => tag.toLowerCase().includes(genreLower))
      const indieMatch = !input.includeIndieOnly || game.isIndie
      return genreMatch && indieMatch
    })
  }

  switch (input.sortBy) {
    case 'players':
      games.sort((left, right) => right.currentPlayers - left.currentPlayers)
      break
    case 'growth':
      games.sort((left, right) => right.percentChange - left.percentChange)
      break
    case 'review':
      games.sort((left, right) => right.reviewScore - left.reviewScore)
      break
    default:
      break
  }

  return games.slice(0, input.limit)
}

function filterGenreMarketData(genre: string | undefined): GenreMarketData[] {
  if (!genre) {
    return GENRE_MARKET_DATA
  }

  const genreLower = genre.toLowerCase()
  return GENRE_MARKET_DATA.filter(
    entry =>
      entry.genre.toLowerCase().includes(genreLower) ||
      entry.topGames.some(game => game.toLowerCase().includes(genreLower)),
  )
}

interface GameSummary extends GameAggregate {
  risingGames: SteamGameData[]
}

function summarizeGames(games: SteamGameData[]): GameSummary {
  const summary: GameSummary = {
    totalPlayers: 0,
    avgGrowth: 0,
    risingCount: 0,
    indieCount: 0,
    risingGames: [],
  }

  for (const game of games) {
    summary.totalPlayers += game.currentPlayers
    summary.avgGrowth += game.percentChange

    if (game.trend === 'rising') {
      summary.risingCount += 1
      summary.risingGames.push(game)
    }

    if (game.isIndie) {
      summary.indieCount += 1
    }
  }

  return summary
}

function buildSteamInsights(games: SteamGameData[], aggregate: GameAggregate, avgGrowth: number) {
  return [
    aggregate.risingCount > 3 ? '🚀 Multiple genres showing growth' : '📊 Stable market conditions',
    aggregate.indieCount > games.length / 2
      ? '🎮 Indies dominating this segment'
      : '🏢 Mix of AAA and indie',
    avgGrowth > 10 ? '📈 Strong market expansion' : avgGrowth > 0 ? '📊 Modest growth' : '📉 Market contraction',
  ]
}

function buildMarketOpportunities(
  genreData: GenreMarketData[],
  risingGames: SteamGameData[],
) {
  const trendingGenres = genreData.reduce<string[]>((entries, entry) => {
    if (entry.trending) {
      entries.push(`${entry.genre}: ${entry.growthRate} growth`)
    }

    return entries
  }, [])

  const risingGameSummary =
    risingGames.length > 0
      ? `Rising games to study: ${risingGames
          .slice(0, 3)
          .map(game => game.name)
          .join(', ')}`
      : null

  return [...trendingGenres, risingGameSummary].filter(Boolean)
}

export function analyzeSteamTrending(input: SteamTrendingInput) {
  const games = filterSteamGames(input)
  const genreData = filterGenreMarketData(input.genre)
  const summary = summarizeGames(games)
  const avgGrowth = games.length > 0 ? summary.avgGrowth / games.length : 0
  const risingGames = summary.risingGames

  return {
    success: true as const,
    query: {
      genre: input.genre,
      includeIndieOnly: input.includeIndieOnly,
      sortBy: input.sortBy,
    },
    resultCount: games.length,
    aggregate: {
      totalCurrentPlayers: summary.totalPlayers,
      averageGrowthRate: `${avgGrowth > 0 ? '+' : ''}${avgGrowth.toFixed(1)}%`,
      risingGamesCount: summary.risingCount,
      indieGamesCount: summary.indieCount,
      topGenreTrending: genreData.find(entry => entry.trending)?.genre || 'General',
    },
    games: games.map(game => ({
      name: game.name,
      currentPlayers: game.currentPlayers,
      peakPlayers24h: game.peakPlayers24h,
      trend: game.trend,
      percentChange: `${game.percentChange > 0 ? '+' : ''}${game.percentChange}%`,
      genre: game.genre,
      reviewScore: game.reviewScore,
      isIndie: game.isIndie,
      priceUSD: game.priceUSD,
    })),
    genreAnalysis: genreData.map(entry => ({
      genre: entry.genre,
      totalPlayers: entry.totalPlayers,
      growthRate: entry.growthRate,
      marketShare: `${entry.marketShare}%`,
      trending: entry.trending,
      topGames: entry.topGames.slice(0, 3),
      recentReleases: entry.recentReleases.slice(0, 2),
    })),
    insights: buildSteamInsights(games, summary, avgGrowth),
    marketOpportunities: buildMarketOpportunities(genreData, risingGames),
    _meta: {
      dataSource: 'steamcharts_simulated',
      timestamp: new Date().toISOString(),
      note: 'Data based on Steam Charts patterns. Configure STEAM_API_KEY for live data.',
    },
  }
}
