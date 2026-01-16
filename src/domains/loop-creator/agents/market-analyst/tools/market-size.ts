/**
 * Market Size Estimator Tool
 *
 * Estimates Total Addressable Market for a game genre/platform combination.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { MarketSizeData } from '../types'

/**
 * Market data by genre (2024 estimates)
 */
const MARKET_DATA: Record<
  string,
  {
    tam: string
    sam: string
    growth: string
    platforms: Record<string, number> // percentage of market
  }
> = {
  roguelike: {
    tam: '$4.2B',
    sam: '$1.8B',
    growth: '18% YoY',
    platforms: { pc: 0.55, console: 0.3, mobile: 0.15 },
  },
  'action-roguelike': {
    tam: '$3.8B',
    sam: '$1.5B',
    growth: '22% YoY',
    platforms: { pc: 0.5, console: 0.35, mobile: 0.15 },
  },
  'survivors-like': {
    tam: '$800M',
    sam: '$400M',
    growth: '85% YoY',
    platforms: { pc: 0.45, mobile: 0.4, console: 0.15 },
  },
  'bullet-hell': {
    tam: '$600M',
    sam: '$250M',
    growth: '12% YoY',
    platforms: { pc: 0.6, console: 0.25, mobile: 0.15 },
  },
  rpg: {
    tam: '$18.5B',
    sam: '$6.2B',
    growth: '8% YoY',
    platforms: { console: 0.4, pc: 0.35, mobile: 0.25 },
  },
  'deck-builder': {
    tam: '$1.2B',
    sam: '$500M',
    growth: '25% YoY',
    platforms: { pc: 0.45, mobile: 0.4, console: 0.15 },
  },
  fps: {
    tam: '$22.8B',
    sam: '$8.5B',
    growth: '6% YoY',
    platforms: { console: 0.45, pc: 0.45, mobile: 0.1 },
  },
  survival: {
    tam: '$5.5B',
    sam: '$2.2B',
    growth: '15% YoY',
    platforms: { pc: 0.55, console: 0.35, mobile: 0.1 },
  },
  indie: {
    tam: '$8.5B',
    sam: '$3.5B',
    growth: '20% YoY',
    platforms: { pc: 0.5, console: 0.3, mobile: 0.2 },
  },
}

/**
 * Market size estimator tool
 */
export const marketSizeEstimatorTool = new DynamicStructuredTool({
  name: 'market_size_estimator',
  description:
    'Estimate the Total Addressable Market (TAM) and Serviceable Market (SAM) for a game genre and platform combination.',
  schema: z.object({
    genre: z.string().describe('Primary game genre (e.g., roguelike, fps, rpg)'),
    subGenre: z
      .string()
      .optional()
      .describe('Sub-genre if applicable (e.g., survivors-like, deck-builder)'),
    platform: z.enum(['pc', 'console', 'mobile', 'all']).describe('Target platform'),
    isIndie: z.boolean().optional().describe('Is this an indie game?'),
  }),
  func: async ({ genre, subGenre, platform, isIndie }): Promise<string> => {
    try {
      // Find best matching market data
      const searchTerms = [subGenre, genre, 'indie'].filter(Boolean)
      let marketData = null

      for (const term of searchTerms) {
        const key = term?.toLowerCase().replace(/\s+/g, '-')
        if (key && MARKET_DATA[key]) {
          marketData = MARKET_DATA[key]
          break
        }
      }

      // Default to indie market if no match
      if (!marketData) {
        marketData = MARKET_DATA['indie']
      }

      // Calculate platform-specific TAM
      let platformMultiplier = 1
      if (platform !== 'all' && marketData.platforms[platform]) {
        platformMultiplier = marketData.platforms[platform]
      }

      // Parse monetary values
      const tamValue = parseFloat(marketData.tam.replace(/[$B]/g, '')) * 1000000000
      const samValue = parseFloat(marketData.sam.replace(/[$B]/g, '')) * 1000000000

      // Apply platform multiplier
      const adjustedTam = tamValue * platformMultiplier
      const adjustedSam = samValue * platformMultiplier

      // Indie games typically capture 5-15% of the market segment
      const indieMultiplier = isIndie ? 0.1 : 0.25
      const realisticSegment = adjustedSam * indieMultiplier

      // Format results
      const formatMoney = (value: number): string => {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
        if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`
        return `$${value.toFixed(0)}`
      }

      const result: MarketSizeData = {
        tam: formatMoney(adjustedTam),
        sam: formatMoney(adjustedSam),
        relevantSegment: formatMoney(realisticSegment),
        growthRate: marketData.growth,
        confidence: marketData === MARKET_DATA['indie'] ? 0.6 : 0.8,
        sources: [
          'Newzoo Gaming Market Report 2024',
          'SteamDB Analytics',
          'Industry analyst estimates',
        ],
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
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Market estimation failed',
      })
    }
  },
})
