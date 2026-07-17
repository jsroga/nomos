/**
 * Competitor Finder Tool
 *
 * Finds and analyzes games competing in the same space.
 * SECRET SAUCE: Detailed competitor profiles with real metrics, loop breakdowns, and market positioning.
 */

import { z } from 'zod'
import { analyzeCompetitors } from './competitor-finder-analyze'
import { createLoopStructuredTool } from './structured-tool'

const competitorFinderSchema = z.object({
  genre: z
    .string()
    .describe('Primary genre to search (roguelike, survivors-like, deck-builder, etc.)'),
  mechanics: z
    .array(z.string())
    .optional()
    .describe('Key mechanics to match (auto-attack, deck-building, etc.)'),
  platform: z.string().optional().describe('Target platform (PC, mobile, console)'),
  analysisDepth: z
    .enum(['quick', 'detailed', 'comprehensive'])
    .optional()
    .describe('How deep to analyze competitors'),
  limit: z.number().optional().describe('Max competitors to return (default 5)'),
})

/**
 * Competitor finder tool
 *
 * AGENT INTELLIGENCE: Knows to look for both direct and adjacent competitors,
 * extract actionable insights, and identify real differentiation opportunities.
 */
export const competitorFinderTool = createLoopStructuredTool({
  name: 'competitor_finder',
  description: `Find and deeply analyze competing games. Returns detailed profiles with:
- Business metrics (revenue, pricing, monetization)
- Loop breakdowns (core/session/meta loop timing)
- Success factors and innovation points
- Design lessons and mistakes to avoid
Use this to understand what works in the market and find differentiation opportunities.`,
  schema: competitorFinderSchema,
  func: async input => {
    const parsed = competitorFinderSchema.parse(input)
    try {
      return JSON.stringify(analyzeCompetitors(parsed))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Competitor analysis failed',
      })
    }
  },
})
