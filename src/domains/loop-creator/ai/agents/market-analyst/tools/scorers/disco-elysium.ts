/**
 * Disco Elysium Scorer Tool
 */

import { createLoopStructuredTool } from '../structured-tool'
import { mechanicsLoopsToolSchema } from '../mechanics-loops-schema'
import { analyzeDiscoElysiumScore } from './disco-elysium-analyze'

export const discoElysiumScorerTool = createLoopStructuredTool({
  name: 'disco_elysium_scorer',
  description: `Score the game design against Disco Elysium-style narrative RPG criteria.
Evaluates:
- Narrative Architecture (25%): How deeply story is woven into gameplay
- Choice Consequence (25%): Meaningful decisions with impact
- Character Systems (20%): Stats/skills affecting narrative outcomes
- Dialogue as Gameplay (15%): Conversation as primary mechanic
- Thematic Cohesion (15%): Unified theme through mechanics

Returns 0-100 score with detailed breakdown. High scores indicate strong narrative RPG appeal.`,
  schema: mechanicsLoopsToolSchema,
  func: async input => {
    try {
      return JSON.stringify(analyzeDiscoElysiumScore(mechanicsLoopsToolSchema.parse(input)))
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Scoring failed',
        finalScore: 0,
        maxScore: 100,
      })
    }
  },
})
