import { z } from 'zod'
import { db } from '@/db'
import { gameLoops, marketAnalyses } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Loop Creator MCP Tools
 */
export const loopCreatorTools = {
  /**
   * Get all loops for a project
   */
  get_loops: {
    description: 'Retrieve all game retention loops and their metadata for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      const results = await db.query.gameLoops.findMany({
        where: eq(gameLoops.projectId, projectId),
        orderBy: [gameLoops.updatedAt],
      })
      return results
    },
  },

  /**
   * Get a specific loop by ID
   */
  get_loop_by_id: {
    description: 'Retrieve a specific game loop with full nodes and edges data.',
    schema: z.object({
      loopId: z.string().uuid().describe('The UUID of the game loop'),
    }),
    handler: async ({ loopId }: { loopId: string }) => {
      const result = await db.query.gameLoops.findFirst({
        where: eq(gameLoops.id, loopId),
      })
      if (!result) throw new Error('Game loop not found')
      return result
    },
  },

  /**
   * Get market analysis for a loop
   */
  get_market_analysis: {
    description: 'Retrieve the latest market analysis for a specific game loop.',
    schema: z.object({
      loopId: z.string().uuid().describe('The UUID of the game loop'),
    }),
    handler: async ({ loopId }: { loopId: string }) => {
      const result = await db.query.marketAnalyses.findFirst({
        where: eq(marketAnalyses.gameLoopId, loopId),
        with: {
          referenceScores: true,
          marketSize: true,
          audienceFit: true,
          primaryArchetype: true,
          momentum: {
            with: {
              genreMomentum: true,
              socialBuzz: true,
              risingCompetitors: true,
            },
          },
          competitors: true,
          trends: true,
          patterns: true,
        },
      })
      if (!result) throw new Error('Market analysis not found')
      return result
    },
  },
}
