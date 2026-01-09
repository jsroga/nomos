import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { WritersRoomState } from '../graph/state'
import { getModel } from '../config/model-config'
import { getSafeMessageHistory } from '../utils/message-utils'
import { z } from 'zod'

// Types for the Planner's output handling are handled via the structured output model

const PlanSchema = z.object({
  thinking: z.string().describe("Your internal monologue and reasoning process. Be detailed."),
  plan: z.array(z.object({
    id: z.string().describe("Unique short ID for the task (e.g. 'task_1')"),
    description: z.string().describe("Clear, actionable task description"),
    assignedAgent: z.enum([
      'premiseArchitect',
      'episodePremiseArchitect',
      'plotArchitect',
      'characterPsychology',
      'consequenceTracker',
      'devilsAdvocate',
      'writer',
      'scriptEditor',
      'magicAgent',
      'search_series_bible'
    ]),
    dependencies: z.array(z.string()).default([]),
    parallelGroupId: z.string().nullable().describe("ID for grouping parallel tasks")
  })).describe(" The list of tasks to execute")
})

import { PLANNER_SYSTEM_PROMPT } from '../prompts/agents/planner'
import { loadPromptCached } from '../prompts/hub-loader'

export const plannerAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  const model = getModel('planner') // Make sure to add this to model-config later if needed, or reuse 'showrunner'

  // Load prompt from Hub
  const loadedPrompt = await loadPromptCached('planner')
  const promptMessages = (loadedPrompt.prompt as any).promptMessages || (loadedPrompt.prompt as any).messages || []
  const systemMessage = promptMessages.find((m: any) => m.lc_id?.[3] === 'SystemMessagePromptTemplate' || m._type === 'system')
  const systemTemplate = systemMessage?.prompt?.template || systemMessage?.template || PLANNER_SYSTEM_PROMPT

  const conversationMessages = getSafeMessageHistory(state.messages, 10).filter(m => m._getType() !== 'system')

  const messages = [
    new SystemMessage(systemTemplate),
    ...conversationMessages
  ]

  try {
    const structuredModel = model.withStructuredOutput(PlanSchema)
    const response = await structuredModel.invoke(messages)

    // Map to state.PlanItem
    const newPlan = response.plan.map(p => ({
      ...p,
      status: 'pending' as const,
      result: undefined
    }))

    return {
      plannerThinking: response.thinking,
      plan: newPlan,
      // We might want to append a message to history saying "Plan created"
      messages: [new AIMessage({
        content: `**Plan Created:**\n` + newPlan.map(p => `- ${p.description} (${p.assignedAgent})`).join('\n'),
        name: 'Planner'
      })]
    }

  } catch (error) {
    console.error("Planner Agent Error:", error)
    return {
      messages: [new AIMessage({ content: `Failed to create plan: ${error instanceof Error ? error.message : String(error)}`, name: "Planner" })]
    }
  }
}
