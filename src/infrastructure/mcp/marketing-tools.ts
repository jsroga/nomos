import { z } from 'zod'
import { db } from '@/db'
import { marketAnalyses, marketAnalysisMomentum, marketAnalysisSocialBuzz } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Marketing & Market Analysis MCP Tools
 */
export const marketingTools = {
  /**
   * Get the full market analysis for a game loop
   */
  get_market_analysis: {
    description:
      'Retrieve the detailed market analysis for a game loop, including SWOT (risks/opportunities), recommendations, and timing.',
    schema: z.object({
      loopId: z.string().uuid().describe('The UUID of the game loop to analyze'),
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
      if (!result) throw new Error('Market analysis not found for this loop')
      return result
    },
  },

  /**
   * Get social buzz signals
   */
  get_social_buzz: {
    description:
      'Retrieve real-time social buzz signals (sentiment, topics, viral potential) for a project.',
    schema: z.object({
      projectId: z.string().uuid().describe('The UUID of the project'),
    }),
    handler: async ({ projectId }: { projectId: string }) => {
      // First find the loops, then their analyses, then momentum, then buzz
      // This is a bit nested, so we'll query for buzz related to the project's loops
      const results = await db.query.marketAnalysisSocialBuzz.findMany({
        where: (buzz, { exists, and, eq }) =>
          exists(
            db
              .select()
              .from(marketAnalysisMomentum)
              .where(
                and(
                  eq(marketAnalysisMomentum.id, buzz.momentumId),
                  exists(
                    db
                      .select()
                      .from(marketAnalyses)
                      .where(eq(marketAnalyses.id, marketAnalysisMomentum.marketAnalysisId))
                  )
                )
              )
          ),
      })
      return results
    },
  },

  /**
   * Get market momentum
   */
  get_market_momentum: {
    description:
      'Retrieve market timing and momentum labels (bullish, neutral, bearish) for a specific analysis.',
    schema: z.object({
      analysisId: z.string().uuid().describe('The UUID of the market analysis'),
    }),
    handler: async ({ analysisId }: { analysisId: string }) => {
      const result = await db.query.marketAnalysisMomentum.findFirst({
        where: eq(marketAnalysisMomentum.marketAnalysisId, analysisId),
        with: {
          genreMomentum: true,
          risingCompetitors: true,
        },
      })
      return result
    },
  },
}
