import { z } from 'zod'
import genreMarketDataJson from '../data/genre-market-data.json'
import steamTopGamesJson from '../data/steam-top-games.json'
import type { GenreMarketData, SteamGameData } from './steam-trending-types'

const steamGameSchema = z.object({
  name: z.string(),
  appId: z.number().optional(),
  currentPlayers: z.number(),
  peakPlayers24h: z.number(),
  averagePlayers30d: z.number(),
  trend: z.enum(['rising', 'stable', 'declining']),
  percentChange: z.number(),
  genre: z.array(z.string()),
  tags: z.array(z.string()),
  releaseDate: z.string(),
  priceUSD: z.union([z.number(), z.literal('free')]),
  reviewScore: z.number(),
  isIndie: z.boolean(),
})

const genreMarketSchema = z.object({
  genre: z.string(),
  totalPlayers: z.number(),
  topGames: z.array(z.string()),
  growthRate: z.string(),
  marketShare: z.number(),
  trending: z.boolean(),
  recentReleases: z.array(z.string()),
})

function parseSteamTopGames(data: unknown): SteamGameData[] {
  return z.array(steamGameSchema).parse(data)
}

function parseGenreMarketData(data: unknown): GenreMarketData[] {
  return z.array(genreMarketSchema).parse(data)
}

export const STEAM_TOP_GAMES = parseSteamTopGames(steamTopGamesJson)
export const GENRE_MARKET_DATA = parseGenreMarketData(genreMarketDataJson)
