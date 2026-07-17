/**
 * Steam Trending Tool
 *
 * Fetches current trending games and market data from Steam.
 */

import { z } from 'zod'
import { analyzeSteamTrending } from './steam-trending-analyze'
import { createLoopStructuredTool } from './structured-tool'

const steamTrendingSchema = z.object({
  genre: z.string().optional().describe('Filter by genre (roguelike, fps, etc.)'),
  includeIndieOnly: z.boolean().optional().describe('Only include indie games'),
  limit: z.number().optional().default(10).describe('Max games to return'),
  sortBy: z
    .enum(['players', 'growth', 'review'])
    .optional()
    .default('players')
    .describe('Sort order for results'),
})

export type { GenreMarketData, SteamGameData } from './steam-trending-types'

/**
 * Steam Trending Tool
 */
export const steamTrendingTool = createLoopStructuredTool({
  name: 'steam_trending',
  description: `Fetch current trending games and market data from Steam.

Returns:
- Top games by player count (overall or filtered by genre)
- Genre market analysis with growth rates
- Rising indie games
- Market share data
- Comparison data for reference games

Use this to understand current player preferences and market movements.`,
  schema: steamTrendingSchema,
  func: async input => {
    try {
      return JSON.stringify(analyzeSteamTrending(steamTrendingSchema.parse(input)))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Steam data fetch failed',
        games: [],
      })
    }
  },
})
