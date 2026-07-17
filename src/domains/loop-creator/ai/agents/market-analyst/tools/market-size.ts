/**
 * Market Size Estimator Tool
 *
 * Estimates Total Addressable Market for a game genre/platform combination.
 */

import { z } from 'zod'
import { createLoopStructuredTool } from './structured-tool'
import { estimateMarketSize } from './market-size-estimate'

const marketSizeSchema = z.object({
  genre: z.string().describe('Primary game genre (e.g., roguelike, fps, rpg)'),
  subGenre: z.string().optional().describe('More specific sub-genre if applicable'),
  platform: z
    .enum(['pc', 'console', 'mobile', 'all'])
    .optional()
    .default('all')
    .describe('Target platform'),
  isIndie: z.boolean().optional().default(true).describe('Whether this is an indie project'),
})

export const marketSizeEstimatorTool = createLoopStructuredTool({
  name: 'market_size_estimator',
  description:
    'Estimate the Total Addressable Market (TAM) and Serviceable Market (SAM) for a game genre and platform combination.',
  schema: marketSizeSchema,
  func: async input => {
    try {
      const parsed = marketSizeSchema.parse(input)
      return estimateMarketSize(parsed)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Market estimation failed',
      })
    }
  },
})
