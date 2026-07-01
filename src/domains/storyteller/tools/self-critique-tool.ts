/**
 * Self-Critique Tool
 *
 * LLM-based quality evaluation against GRRM/Gilligan standards. Creative quality
 * is judged by a model (SelfCritiqueAgent), not regex heuristics — slop avoidance
 * is steered via prompt guidance (see anti-slop-phrases), and judged here.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const selfCritiqueTool = createTool({
  id: 'self_critique',
  description:
    'Evaluate a draft against GRRM/Gilligan quality standards using an LLM judge. Call this BEFORE finalizing any scene or beat content. Returns a quality score (0-1) and specific issues to address.',
  inputSchema: z.object({
    draft: z.string().describe('The draft text to evaluate'),
    criteria: z
      .enum(['scene', 'dialogue', 'beat', 'premise'])
      .describe('What type of content is being evaluated'),
    logline: z.string().optional().describe('Beat logline for context'),
    beatType: z.string().optional().describe('Beat type for context'),
  }),
  execute: async (args: any) => {
    const context = args?.context || args
    const draft: string = context.draft || ''
    const criteria = context.criteria || 'scene'

    if (!draft.trim()) {
      return {
        overallScore: 1,
        shouldRevise: false,
        issues: [],
        suggestion: 'No content to evaluate',
      }
    }

    const { createSelfCritiqueAgent } = await import('@/domains/storyteller/agents/SelfCritiqueAgent')
    const agent = await createSelfCritiqueAgent()
    const result = await agent.critique(
      draft,
      JSON.stringify({ criteria, logline: context.logline, beatType: context.beatType })
    )

    // SelfCritiqueAgent returns a 0-100 score; normalize to 0-1.
    const rawScore = typeof result.score === 'number' ? result.score : 50
    const overallScore = rawScore > 1 ? rawScore / 100 : rawScore
    const shouldRevise = result.shouldRevise ?? overallScore < 0.7

    return {
      overallScore,
      shouldRevise,
      issues: result.issue ? [result.issue] : [],
      suggestion:
        result.fix || (shouldRevise ? 'Revise per critique' : 'Quality acceptable - proceed'),
    }
  },
})
