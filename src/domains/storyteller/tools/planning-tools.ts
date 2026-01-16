import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { AgentAction } from '../actions/types'

// Schema for creating a plan
export const CreatePlanSchema = z.object({
  tasks: z
    .array(
      z.object({
        description: z.string().describe('Clear description of the task'),
        assignedAgent: z
          .enum([
            'premiseArchitect',
            'episodePremiseArchitect',
            'plotArchitect',
            'characterPsychology',
            'consequenceTracker',
            'devilsAdvocate',
            'writer',
            'scriptEditor',
            'magicAgent',
            'search_series_bible',
          ])
          .describe('The agent best suited for this task'),
        dependencies: z
          .array(z.string())
          .optional()
          .describe('IDs of tasks that must be completed first'),
        parallelGroupId: z
          .string()
          .optional()
          .describe('Group ID for tasks that can run in parallel'),
      })
    )
    .describe('List of tasks to execute'),
})

// Schema for updating plan status is internal to the graph logic usually,
// but the planner might want to modify the plan dynamically.
// For now, the Planner's main detailed output is a JSON that includes the `actions` array,
// similar to other agents.

// We will define the Planner's specific actions here.

export type PlannerActionType = 'CREATE_PLAN' | 'UPDATE_PLAN_STATUS' | 'ADD_TASKS'

export const PLANNER_TOOLS = [
  // The planner mostly "thinks" and returns a structured response that the Graph Reducer handles.
  // However, we can give it tools if it needs to look things up.
  // For now, it relies on the state.
]
