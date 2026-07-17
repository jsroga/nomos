/**
 * Audience Analyzer Tool
 *
 * Analyzes how well the game loop fits target audiences using psychographic profiling.
 */

import { createLoopStructuredTool } from './structured-tool'
import { z } from 'zod'
import {
  buildAudienceAnalysisText,
  buildAudienceAnalyzerPayload,
  partitionAudienceScores,
  resolvePrimaryAudience,
  scoreAllAudienceProfiles,
} from './audience-analyzer-analyze'

const audienceAnalyzerSchema = z.object({
  mechanics: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .describe('Game mechanics to analyze'),
  targetAudience: z
    .string()
    .optional()
    .describe('Primary target audience (optional - will analyze all if not specified)'),
  platform: z.string().optional().describe('Target platform'),
  sessionLength: z.string().optional().describe('Expected session length'),
  gameGenre: z.string().optional().describe('Game genre'),
  gameDescription: z.string().optional().describe('Overall game description'),
})

export const audienceAnalyzerTool = createLoopStructuredTool({
  name: 'audience_analyzer',
  description: `Analyze how well the game design fits target audiences using psychographic profiling.
Returns:
- Fit scores for multiple audience types
- Spending behavior predictions
- Session design compatibility
- Specific recommendations for each audience

Audience types include: Achievement Hunter, Discovery Seeker, Social Player, Competitive Player, Casual Relaxer, Mobile Commuter, Narrative Seeker.`,
  schema: audienceAnalyzerSchema,
  func: async input => {
    try {
      const parsed = audienceAnalyzerSchema.parse(input)
      const allText = buildAudienceAnalysisText(parsed)
      const audienceScores = scoreAllAudienceProfiles(allText, parsed.platform)
      const primaryTarget = resolvePrimaryAudience(audienceScores, parsed.targetAudience)
      const { topAudiences, poorFits } = partitionAudienceScores(audienceScores)

      return JSON.stringify(
        buildAudienceAnalyzerPayload(parsed, audienceScores, primaryTarget, topAudiences, poorFits),
      )
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Audience analysis failed',
      })
    }
  },
})
