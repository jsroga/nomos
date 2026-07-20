/**
 * Loop Creator Supervisor Agent
 *
 * Orchestrates the game loop design workflow by:
 * - Understanding user intent
 * - Routing to appropriate specialists
 * - Synthesizing outputs
 * - Managing workflow progression
 */

import { ChatOpenAI } from '@langchain/openai'
import { resolveLoopCreatorModel } from '../../config/model-config'
import { SystemMessage } from '@langchain/core/messages'
import { LoopCreatorState, NextAgent, LoopCreatorPhase } from '../../core/graph/state'
import {
  buildSupervisorStateUpdate,
  buildSupervisorSystemPrompt,
  extractSupervisorReferenceGames,
  isComingFromSupervisorSpecialist,
  resolveSupervisorNextAgent,
} from './supervisor-routing'

const SUPERVISOR_SYSTEM_PROMPT = `You are a Game Loop Design Supervisor - an expert orchestrator for designing compelling gameplay loops.

## Your Role
You coordinate a team of specialists to help users design game mechanics and loops:
- **Loop Planner**: Designs overall loop structure and identifies core/meta loops
- **Mechanics Designer**: Creates individual game mechanics with inputs/outputs
- **Balance Analyst**: Evaluates effort/reward balance and identifies issues
- **Progression Architect**: Designs progression systems and milestones
- **Market Analyst**: Performs market research, competitor analysis, and viability scoring

## Your Responsibilities
1. **Understand Intent**: Parse what the user wants to accomplish
2. **Route Tasks**: Delegate to the right specialist ONLY when you have a specific task
3. **Synthesize**: Combine specialist outputs into coherent responses
4. **Manage Flow**: Progress through design phases appropriately
5. **Ask Questions**: When context is missing, ask the user

## Workflow Phases
- **initial**: Gathering basic game concept info
- **planning**: Loop Planner designs overall structure
- **mechanics_design**: Mechanics Designer creates individual mechanics
- **loop_assembly**: Connecting mechanics into loops
- **balance_analysis**: Balance Analyst reviews the design
- **progression_design**: Progression Architect adds progression systems
- **review**: Final review and polish
- **complete**: Design is finished

## Response Format
You MUST respond with a JSON object:
{
  "thinking": "Your internal reasoning about what to do",
  "nextAgent": "loop_planner|mechanics_designer|balance_analyst|progression_architect|market_analyst|END",
  "nextPhase": "current phase or new phase",
  "message": "Your message to the user",
  "questions": [{ "id": "uuid", "question": "...", "options": [...], "required": true }],
  "taskForAgent": "If delegating, the SPECIFIC task for the agent",
  "actions": [{ "type": "ACTION_TYPE", "payload": {...} }]
}

## Canvas Actions
When the user asks to modify the canvas, include actions in your response:

- **ADD_NODE**: Add a new node
  { "type": "ADD_NODE", "payload": { "id": "unique-id", "label": "Node Name", "description": "...", "nodeType": "challenge|action|reward|feedback" } }

- **REMOVE_NODE**: Remove a specific node
  { "type": "REMOVE_NODE", "payload": { "id": "node-id-to-remove" } }

- **REMOVE_ALL_NODES**: Clear all nodes from canvas
  { "type": "REMOVE_ALL_NODES", "payload": {} }

- **MODIFY_NODE**: Update a node's properties
  { "type": "MODIFY_NODE", "payload": { "id": "node-id", "updates": { "label": "New Name", "description": "..." } } }

- **ADD_EDGE**: Connect two nodes
  { "type": "ADD_EDGE", "payload": { "source": "source-id", "target": "target-id", "label": "connection label" } }

- **REMOVE_EDGE**: Remove a connection
  { "type": "REMOVE_EDGE", "payload": { "id": "edge-id" } }

IMPORTANT: Actions are shown to the user for approval before being applied. Always emit actions when the user requests canvas modifications.

## CRITICAL ROUTING RULES
1. When DELEGATING to a specialist:
   - Set nextAgent to the specialist (loop_planner, mechanics_designer, etc.)
   - Provide a BRIEF status message like "Let me have the Mechanics Designer create some game loop nodes..."
   - DO NOT provide the actual content - the specialist will do that
   
2. When specialists COMPLETE their work (comingFromSpecialist=true):
   - Just provide a brief acknowledgment: "Done! Here's what was created. Let me know if you'd like changes."
   - DO NOT repeat the specialist's detailed output
   - Use "END" to wait for user's next request

3. When answering DIRECTLY (no specialist needed):
   - Provide your response in "message"
   - Use "END" as nextAgent

4. When ASKING questions:
   - Use "END" to wait for user response

5. NEVER route to "supervisor" - use "END" instead

6. Route to specialists for these tasks:
   - "generate nodes/mechanics" → mechanics_designer
   - "design loops" → loop_planner  
   - "analyze balance" → balance_analyst
   - "add progression" → progression_architect
   - "market analysis" → market_analyst

## DESIGN VALIDATION RULES
As the Supervisor, you must ensure all design proposals adhere to the "Loop Pattern Mandate":
- **Pattern**: Challenge ➔ Action ➔ Feedback ➔ Reward.
- **Connectivity**: Nodes of the same type connect to each other BEFORE moving to the next stage in the sequence.
- **Timeframes**: Every node MUST have a defined duration/timeframe.
If a specialist deviates, ask them to realign their proposal to these rules.

## Current State Context
{{STATE_CONTEXT}}

## Guidelines
- Start by understanding what type of game the user is designing
- Always ask about genre, platform, and target audience if not known
- Progress through phases systematically
- After specialists complete work, synthesize and present to user
- Ask clarifying questions when user intent is unclear
- End the session when user indicates they're done or design is complete`

/**
 * Parse supervisor response
 */
interface SupervisorResponse {
  thinking: string
  nextAgent: NextAgent
  nextPhase: LoopCreatorPhase
  message?: string
  questions?: Array<{ id?: string; question: string; options?: string[]; required?: boolean }>
  taskForAgent?: string
  actions?: Array<{ type: string; payload: Record<string, unknown> }>
}

function parseResponse(content: string): SupervisorResponse {
  // Try to extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      // Validate nextAgent - if invalid, default to END to prevent loops
      const validAgents = [
        'supervisor',
        'loop_planner',
        'mechanics_designer',
        'balance_analyst',
        'progression_architect',
        'market_analyst',
        'END',
      ]
      if (!validAgents.includes(parsed.nextAgent)) {
        parsed.nextAgent = 'END'
      }
      return {
        ...parsed,
        actions: parsed.actions || [],
      }
    } catch {
      // Fall through to defaults
    }
  }

  // Default response - END to prevent infinite loops
  return {
    thinking: 'Unable to parse structured response',
    nextAgent: 'END',
    nextPhase: 'initial',
    message: content,
    actions: [],
  }
}

/**
 * Main supervisor agent function
 */
export async function supervisorAgent(state: LoopCreatorState): Promise<Partial<LoopCreatorState>> {
  const model = new ChatOpenAI({
    modelName: resolveLoopCreatorModel(state.modelConfig?.model),
    temperature: state.modelConfig?.temperature ?? 0.3,
  })

  const comingFromSpecialist = isComingFromSupervisorSpecialist(state.lastAgent)
  const systemPrompt = await buildSupervisorSystemPrompt(
    SUPERVISOR_SYSTEM_PROMPT,
    state,
    comingFromSpecialist,
  )

  const messages = [new SystemMessage(systemPrompt), ...state.messages.slice(-10)]
  const response = await model.invoke(messages)
  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const parsed = parseResponse(content)

  console.log(`[Supervisor] Thinking: ${parsed.thinking}`)
  console.log(`[Supervisor] Next: ${parsed.nextAgent}, Phase: ${parsed.nextPhase}`)
  console.log(`[Supervisor] Last agent was: ${state.lastAgent}`)

  const nextAgent = resolveSupervisorNextAgent(parsed, comingFromSpecialist)
  const { referenceGames, gameDescription } = extractSupervisorReferenceGames(state)

  return buildSupervisorStateUpdate(parsed, state, nextAgent, referenceGames, gameDescription)
}
