export interface SteamGameData {
  name: string
  appId?: number
  currentPlayers: number
  peakPlayers24h: number
  averagePlayers30d: number
  trend: 'rising' | 'stable' | 'declining'
  percentChange: number
  genre: string[]
  tags: string[]
  releaseDate: string
  priceUSD: number | 'free'
  reviewScore: number
  isIndie: boolean
}

export interface GenreMarketData {
  genre: string
  totalPlayers: number
  topGames: string[]
  growthRate: string
  marketShare: number
  trending: boolean
  recentReleases: string[]
}
