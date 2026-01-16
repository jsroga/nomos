/**
 * Handoff Tool
 *
 * Enables agents to transfer control to specialist agents.
 * Part of the Handoffs pattern from LangChain multi-agent architecture.
 *
 * Replaces the old "delegate" pattern with direct agent-to-agent handoffs.
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Valid specialist agents that can receive handoffs
 */
export const SPECIALIST_AGENTS = [
  'writer',
  'plot_architect',
  'character_psychology',
  'premise_architect',
  'episode_premise_architect',
  'devils_advocate',
  'magic_agent',
  'script_editor',
  'planner',
] as const

export type SpecialistAgent = (typeof SPECIALIST_AGENTS)[number]

/**
 * Task to be handed off to a specialist
 */
export interface HandoffTask {
  agent: SpecialistAgent
  description: string
  context: Record<string, any>
  priority?: 'high' | 'normal' | 'low'
  estimatedComplexity?: 'simple' | 'moderate' | 'complex'
}

/**
 * Handoff tool that agents use to transfer control
 */
export const handoffTool = tool(
  async ({ targetAgent, task, context, priority, reason }, config) => {
    console.log(`[Handoff] ${config?.configurable?.currentAgent || 'Unknown'} → ${targetAgent}`)
    console.log(`[Handoff] Task: ${task}`)
    console.log(`[Handoff] Reason: ${reason || 'Not specified'}`)

    // The actual state update will be handled by the graph
    // This tool just signals the intent to handoff
    return {
      handoff: true,
      targetAgent,
      task,
      context,
      priority: priority || 'normal',
      reason,
    }
  },
  {
    name: 'handoff_to_specialist',
    description: `Transfer control to a specialist agent to complete a specific task. Use this when:
- The task requires specialized knowledge or skills
- You need another agent's expertise
- The task is outside your primary responsibility

Available specialists:
- writer: Script writing, dialogue, scenes
- plot_architect: Story structure, beats, plot points
- character_psychology: Character development, motivations, arcs
- premise_architect: World building, series bible, factions
- episode_premise_architect: Episode premises using Ozymandias framework
- devils_advocate: Critical review, plot holes, consistency checks
- magic_agent: Creative ideas, brainstorming, chaos injection
- script_editor: Script review, revisions, polish
- planner: Multi-step task planning and breakdown

Important: When handing off, clearly describe what the specialist should do.`,
    schema: z.object({
      targetAgent: z.enum(SPECIALIST_AGENTS).describe('Which specialist should handle this task'),
      task: z
        .string()
        .describe(
          'Clear, specific task for the specialist. Be explicit about what needs to be done.'
        ),
      context: z
        .record(z.any())
        .describe('Relevant context the specialist needs (characters, beats, constraints, etc.)'),
      priority: z.enum(['high', 'normal', 'low']).optional().describe('Task priority'),
      reason: z.string().optional().describe('Why this handoff is needed'),
    }),
  }
)

/**
 * Check if a tool call is a handoff
 */
export function isHandoffToolCall(toolCall: any): boolean {
  return toolCall?.name === 'handoff_to_specialist'
}

/**
 * Extract handoff details from a tool call
 */
export function extractHandoffDetails(toolCall: any): HandoffTask | null {
  if (!isHandoffToolCall(toolCall)) return null

  const args = toolCall.args || {}

  return {
    agent: args.targetAgent,
    description: args.task,
    context: args.context || {},
    priority: args.priority || 'normal',
    estimatedComplexity: estimateComplexity(args.task),
  }
}

/**
 * Estimate task complexity based on description
 */
function estimateComplexity(taskDescription: string): 'simple' | 'moderate' | 'complex' {
  const complexKeywords = ['full', 'complete', 'entire', 'all', 'comprehensive', 'detailed']
  const simpleKeywords = ['quick', 'simple', 'just', 'only', 'single']

  const lower = taskDescription.toLowerCase()

  if (complexKeywords.some(kw => lower.includes(kw))) {
    return 'complex'
  }

  if (simpleKeywords.some(kw => lower.includes(kw))) {
    return 'simple'
  }

  return 'moderate'
}
