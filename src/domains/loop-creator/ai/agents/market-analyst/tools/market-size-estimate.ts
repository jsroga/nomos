import { MarketSizeData } from '../types'
import { MARKET_DATA } from './market-size-data'

function formatMoney(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`
  return `$${value.toFixed(0)}`
}

function resolveMarketData(genre: string, subGenre?: string) {
  const searchTerms = [subGenre, genre, 'indie'].filter(Boolean)
  for (const term of searchTerms) {
    const key = term?.toLowerCase().replace(/\s+/g, '-')
    if (key && MARKET_DATA[key]) {
      return MARKET_DATA[key]
    }
  }
  return MARKET_DATA.indie
}

function platformMultiplierFor(
  platform: string,
  marketData: (typeof MARKET_DATA)[string],
): number {
  if (platform === 'all' || !marketData.platforms[platform]) {
    return 1
  }
  return marketData.platforms[platform]
}

export function estimateMarketSize(input: {
  genre: string
  subGenre?: string
  platform: string
  isIndie?: boolean
}): string {
  const { genre, subGenre, platform, isIndie } = input
  const marketData = resolveMarketData(genre, subGenre)
  const platformMultiplier = platformMultiplierFor(platform, marketData)

  const tamValue = parseFloat(marketData.tam.replace(/[$B]/g, '')) * 1000000000
  const samValue = parseFloat(marketData.sam.replace(/[$B]/g, '')) * 1000000000
  const adjustedTam = tamValue * platformMultiplier
  const adjustedSam = samValue * platformMultiplier
  const indieMultiplier = isIndie ? 0.1 : 0.25
  const realisticSegment = adjustedSam * indieMultiplier

  const result: MarketSizeData = {
    tam: formatMoney(adjustedTam),
    sam: formatMoney(adjustedSam),
    relevantSegment: formatMoney(realisticSegment),
    growthRate: marketData.growth,
    confidence: marketData === MARKET_DATA.indie ? 0.6 : 0.8,
    sources: ['Newzoo Gaming Market Report 2024', 'SteamDB Analytics', 'Industry analyst estimates'],
  }

  return JSON.stringify({
    success: true,
    data: result,
    interpretation: {
      tam: `Total market for ${genre} games: ${result.tam}`,
      sam: `Serviceable market for ${platform}: ${result.sam}`,
      realistic: `Realistic target for ${isIndie ? 'indie' : 'studio'}: ${result.relevantSegment}`,
      growth: `Market growing at ${result.growthRate}`,
    },
    recommendations: [
      adjustedSam > 1000000000
        ? 'Large market - differentiation is key'
        : 'Niche market - focus on dedicated audience',
      marketData.growth.includes('20') ||
      marketData.growth.includes('25') ||
      marketData.growth.includes('85')
        ? 'High growth market - good timing for entry'
        : 'Stable market - quality over timing',
    ],
  })
}
