/**
 * Market Momentum Tool
 *
 * Aggregates real-time signals from Twitter, Steam, and Reddit to provide
 * a comprehensive view of current market conditions.
 */

import { z } from 'zod'
import { analyzeMarketMomentum } from './market-momentum-analyze'
import { createLoopStructuredTool } from './structured-tool'

const marketMomentumSchema = z.object({
  targetGenres: z
    .array(z.string())
    .optional()
    .describe('Specific genres to analyze (e.g., ["roguelike", "extraction", "narrative"])'),
  includeRisingCompetitors: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include rising competitors analysis'),
  includeSocialBuzz: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include social buzz indicators'),
})

export type { GenreMomentum, RisingCompetitor, SocialBuzz } from './market-momentum-types'

/**
 * Market Momentum Tool
 */
export const marketMomentumTool = createLoopStructuredTool({
  name: 'market_momentum_analysis',
  description: `Aggregate real-time market signals from Twitter, Steam, and Reddit.

Provides:
- Genre momentum scores (-100 to +100)
- Market timing indicators (optimal/good/saturated/risky)
- Competitor density analysis
- Social buzz metrics
- Rising competitors to study
- Opportunities and risks per genre

Use this for comprehensive market timing and positioning decisions.`,
  schema: marketMomentumSchema,
  func: async input => {
    try {
      return JSON.stringify(analyzeMarketMomentum(marketMomentumSchema.parse(input)))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Market momentum analysis failed',
        genreAnalysis: [],
      })
    }
  },
})
