/**
 * Complete Task Tool
 *
 * Allows agents to mark their current task as complete and return control.
 * Part of the Handoffs pattern - ensures tasks are properly tracked and completed.
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Task completion result
 */
export interface TaskCompletionResult {
  completed: boolean
  summary: string
  nextSteps?: string
  artifacts?: Record<string, any>
  recommendations?: string[]
}

/**
 * Complete task tool that agents use to signal task completion
 */
export const completeTaskTool = tool(
  async ({ summary, nextSteps, artifacts, recommendations }, config) => {
    const currentAgent = config?.configurable?.currentAgent || 'Unknown'

    console.log(`[Task Complete] ${currentAgent} finished task`)
    console.log(`[Task Complete] Summary: ${summary}`)

    if (nextSteps) {
      console.log(`[Task Complete] Next steps: ${nextSteps}`)
    }

    return {
      completed: true,
      summary,
      nextSteps,
      artifacts: artifacts || {},
      recommendations: recommendations || [],
      timestamp: Date.now(),
    }
  },
  {
    name: 'complete_task',
    description: `Mark your current task as complete and return control. Use this when:
- You've finished what was asked
- The user's request has been fulfilled
- No further specialist help is needed

Provide a clear summary of what was accomplished and any next steps.`,
    schema: z.object({
      summary: z.string().describe('Clear summary of what was accomplished'),
      nextSteps: z
        .string()
        .optional()
        .describe('Suggested next steps for the user or other agents'),
      artifacts: z
        .record(z.any())
        .optional()
        .describe('Any data/artifacts produced (IDs of created items, etc.)'),
      recommendations: z.array(z.string()).optional().describe('Recommendations for the user'),
    }),
  }
)

/**
 * Check if a tool call is a task completion
 */
export function isCompleteTaskToolCall(toolCall: any): boolean {
  return toolCall?.name === 'complete_task'
}

/**
 * Extract completion details from a tool call
 */
export function extractCompletionDetails(toolCall: any): TaskCompletionResult | null {
  if (!isCompleteTaskToolCall(toolCall)) return null

  const args = toolCall.args || {}

  return {
    completed: true,
    summary: args.summary,
    nextSteps: args.nextSteps,
    artifacts: args.artifacts,
    recommendations: args.recommendations,
  }
}
