/**
 * Pattern Matcher Tool
 *
 * Matches loop patterns against known successful game design archetypes.
 */

import { z } from 'zod'
import { analyzePatternMatches } from './pattern-matcher-run'
import { createLoopStructuredTool } from './structured-tool'

const patternMatcherSchema = z.object({
  mechanics: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .describe('List of game mechanics to analyze'),
  connections: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional()
    .describe('Connections between mechanics'),
  gameGenre: z.string().optional().describe('Game genre for context'),
  gameDescription: z.string().optional().describe('Overall game description'),
})

/**
 * Pattern matcher tool with sophisticated analysis
 */
export const patternMatcherTool = createLoopStructuredTool({
  name: 'pattern_matcher',
  description: `Analyze game loop against known successful design patterns. Returns:
- Which patterns the design follows and how well
- Missing patterns that could strengthen the design
- Implementation guidance for each pattern
- Compatibility analysis between patterns

Patterns include: Loop structures, Progression systems, Engagement hooks, Feedback systems, Player experience patterns.`,
  schema: patternMatcherSchema,
  func: async input => {
    const parsed = patternMatcherSchema.parse(input)
    try {
      return JSON.stringify(analyzePatternMatches(parsed))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Pattern matching failed',
      })
    }
  },
})
