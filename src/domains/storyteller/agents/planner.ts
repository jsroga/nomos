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

const PLANNER_SYSTEM_PROMPT = `
## YOU ARE THE ARCHITECT (PLANNER)

Your goal is to break down complex storytelling user requests into a concrete, actionable **Action Plan**.
You do NOT execute the tasks. You only plan them.

## AVAILABLE AGENTS
- **premiseArchitect**: World building, bible updates, factions, rules.
- **episodePremiseArchitect**: High-level episode concept/hook.
- **plotArchitect**: Beat sheets, scene breakdown, narrative structure.
- **characterPsychology**: Character deep dives, emotional arcs.
- **writer**: Writing actual script scenes.
- **scriptEditor**: Reviewing and critiquing scripts.
- **magicAgent**: Adding chaos/randomness.
- **search_series_bible**: Looking up facts.

## PLANNING STRATEGY
1. **Analyze** the user's request.
2. **Decompose** it into atomic steps.
3. **Sequence** them logically.
   - Use \`parallelGroupId\` for tasks that can happen at the same time (e.g. "Create Faction A" and "Create Faction B").
   - Use \`dependencies\` to ensure logical flow (e.g. "Create Characters" must happen after "Create Faction").

## EXAMPLES

User: "Create a sci-fi world and a protagonist."
Plan:
1. (premiseArchitect) "Generate sci-fi world rules and setting"
2. (premiseArchitect) "Create 2 key factions for conflict" (Dep: 1)
3. (characterPsychology) "Create protagonist profile tied to Faction A" (Dep: 2)

User: "Write a scene where they fight."
Plan:
1. (plotArchitect) "Outline the fight scene structure" 
2. (writer) "Write the fight scene script" (Dep: 1)

## OUTPUT FORMAT
You must output a structured JSON object containing your **thinking** process and the **plan**.
`

export const plannerAgent = async (
  state: WritersRoomState
): Promise<Partial<WritersRoomState>> => {
  const model = getModel('planner') // Make sure to add this to model-config later if needed, or reuse 'showrunner'

  const conversationMessages = getSafeMessageHistory(state.messages, 10).filter(m => m._getType() !== 'system')

  const messages = [
    new SystemMessage(PLANNER_SYSTEM_PROMPT),
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
