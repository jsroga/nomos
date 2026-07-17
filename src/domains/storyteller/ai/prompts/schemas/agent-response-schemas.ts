/** Agent structured response Zod schemas. */
import { z } from 'zod'
import { AgentActionSchema } from './agent-action-schemas'
import { StoryPlanSchema } from './story-plan-schemas'

export const BaseAgentResponseSchema = z.object({
  message: z.string().describe('Your response to the user - be specific and concrete'),
  thinking: z.string().nullable().optional().describe('Your reasoning process (for transparency)'),
  confidence: z.number().min(0).max(1).nullable().optional().describe('Your confidence level 0-1'),
  nextAgent: z.string().nullable().optional().describe('Suggest which agent should respond next'),
})

export type StoryPlan = z.infer<typeof StoryPlanSchema>

export const PremiseArchitectResponseSchema = BaseAgentResponseSchema.extend({
  actions: z.array(AgentActionSchema).nullable().optional(),
  storyPlan: StoryPlanSchema.nullable().optional(),
})

export type PremiseArchitectResponse = z.infer<typeof PremiseArchitectResponseSchema>
