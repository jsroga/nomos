import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db } from '../../../../db'
import { gameLoops, marketAnalyses } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Schema for Get Loops
const GetLoopsSchema = z.object({
  projectId: z.string().uuid().describe('The UUID of the project'),
})

export const createGetLoopsTool = () =>
  createTool({
    id: 'get_game_loops',
    description: 'Retrieve all game retention loops and their metadata for a project.',
    schema: GetLoopsSchema,
    execute: async ({ projectId }) => {
      try {
        const results = await db.query.gameLoops.findMany({
          where: eq(gameLoops.projectId, projectId),
          orderBy: [gameLoops.updatedAt],
        })
        return { success: true, loops: results }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// Schema for Get Loop By ID
const GetLoopByIdSchema = z.object({
  loopId: z.string().uuid().describe('The UUID of the game loop'),
})

export const createGetLoopByIdTool = () =>
  createTool({
    id: 'get_game_loop_by_id',
    description: 'Retrieve a specific game loop with full nodes and edges data.',
    schema: GetLoopByIdSchema,
    execute: async ({ loopId }) => {
      try {
        const result = await db.query.gameLoops.findFirst({
          where: eq(gameLoops.id, loopId),
        })
        if (!result) return { success: false, error: 'Game loop not found' }

        // Validate against our rigorous schema if possible, or return raw
        // For now, return raw to avoid stricter validation blocking legacy data
        return { success: true, loop: result }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// Schema for Market Analysis
const GetMarketAnalysisSchema = z.object({
  loopId: z.string().uuid().describe('The UUID of the game loop'),
})

export const createGetMarketAnalysisTool = () =>
  createTool({
    id: 'get_market_analysis',
    description: 'Retrieve the latest market analysis for a specific game loop.',
    schema: GetMarketAnalysisSchema,
    execute: async ({ loopId }) => {
      try {
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
        if (!result) return { success: false, error: 'Market analysis not found' }
        return { success: true, analysis: result }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
