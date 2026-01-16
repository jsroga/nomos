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
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { LoopCreatorState, NextAgent, LoopCreatorPhase, LoopAgentQuestion, LoopAgentActionType } from '../graph/state'
import { v4 as uuidv4 } from 'uuid'
import { buildCrossDomainContext } from '@/lib/agent-context/cross-domain-context'

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
 * Build context string from current state
 */
function buildStateContext(state: LoopCreatorState): string {
  const parts: string[] = []

  parts.push(`Session: ${state.sessionId}`)
  parts.push(`Phase: ${state.currentPhase}`)
  parts.push(`Round: ${state.roundCount}`)

  if (state.gameGenre) parts.push(`Genre: ${state.gameGenre}`)
  if (state.gamePlatform) parts.push(`Platform: ${state.gamePlatform}`)
  if (state.targetAudience) parts.push(`Audience: ${state.targetAudience}`)
  if (state.gameDescription) parts.push(`Description: ${state.gameDescription}`)

  // Show current canvas state
  parts.push(`\n=== CURRENT CANVAS ===`)
  parts.push(`Mechanics/Nodes: ${state.mechanics.length}`)
  if (state.mechanics.length > 0) {
    state.mechanics.forEach(m => {
      const desc = m.description ? ` - ${m.description.slice(0, 60)}` : ''
      parts.push(`  • ${m.name} (${m.type})${desc}`)
    })
  } else {
    parts.push(`  (No nodes on canvas yet)`)
  }

  parts.push(`\nConnections: ${state.connections.length}`)
  if (state.connections.length > 0) {
    state.connections.forEach(c => {
      parts.push(`  • ${c.source} → ${c.target}${c.label ? ` (${c.label})` : ''}`)
    })
  }

  parts.push(`\nLoops: ${state.loops.length}`)
  if (state.loops.length > 0) {
    state.loops.forEach(l => {
      parts.push(`  • ${l.name} (${l.type}): ${l.description?.slice(0, 50) || 'No description'}`)
    })
  }

  parts.push(`Progression Systems: ${state.progressionSystems.length}`)

  if (state.balanceAnalysis) {
    parts.push(`\nBalance Score: ${state.balanceAnalysis.overallScore}/10`)
    parts.push(`Balance Issues: ${state.balanceAnalysis.issues.length}`)
  }

  return parts.join('\n')
}

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
  actions?: Array<{ type: string; payload: any }>
}

function parseResponse(content: string): SupervisorResponse {
  // Try to extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      // Validate nextAgent - if invalid, default to END to prevent loops
      const validAgents = ['supervisor', 'loop_planner', 'mechanics_designer', 'balance_analyst', 'progression_architect', 'market_analyst', 'END']
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
export async function supervisorAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.3,
  })

  // Check if we're returning from a specialist - if so, we should synthesize and END
  const specialists = ['loop_planner', 'mechanics_designer', 'balance_analyst', 'progression_architect', 'market_analyst']
  const comingFromSpecialist = state.lastAgent && specialists.includes(state.lastAgent)

  // Build system prompt with context
  let systemPrompt = SUPERVISOR_SYSTEM_PROMPT.replace(
    '{{STATE_CONTEXT}}',
    buildStateContext(state)
  )
  
  // Add cross-domain context (entities from other tools)
  if (state.projectId) {
    try {
      const crossDomainContext = await buildCrossDomainContext(state.projectId)
      if (crossDomainContext) {
        systemPrompt += `\n\n## Cross-Domain Entities (From Other Tools)\n${crossDomainContext}\n\nNOTE: You can reference these entities when designing game loops. For example, if there's a character from Storyteller, you can design mechanics tailored to that character.`
        console.log('[Supervisor] Loaded cross-domain context')
      }
    } catch (error) {
      console.warn('[Supervisor] Failed to load cross-domain context:', error)
    }
  }

  // Add instruction if coming from specialist
  if (comingFromSpecialist) {
    systemPrompt += `\n\n## IMPORTANT: You just received results from ${state.lastAgent}
The specialist has completed their work. You MUST:
1. Provide a BRIEF acknowledgment (1-2 sentences max) - the specialist's detailed output is already visible to the user
2. DO NOT repeat or summarize the specialist's output - it's already displayed above your message  
3. Use "END" as nextAgent to wait for user's next request
4. Example good response: "Done! I've created some game loop nodes. Check the suggestion panel on the left to approve them, or let me know if you'd like changes."
5. Example BAD response: Repeating all the nodes, mechanics, and connections the specialist already created.
DO NOT route to another specialist unless the user explicitly asks for more.`
  }

  // Build messages
  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages.slice(-10), // Last 10 messages for context
  ]

  // Call the model
  const response = await model.invoke(messages)
  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content)

  const parsed = parseResponse(content)

  console.log(`[Supervisor] Thinking: ${parsed.thinking}`)
  console.log(`[Supervisor] Next: ${parsed.nextAgent}, Phase: ${parsed.nextPhase}`)
  console.log(`[Supervisor] Last agent was: ${state.lastAgent}`)

  // Determine next agent with safeguards against infinite loops
  let nextAgent = parsed.nextAgent

  // RULE 1: If coming from a specialist, ALWAYS end to show results to user
  if (comingFromSpecialist) {
    console.log(`[Supervisor] Coming from specialist ${state.lastAgent} - forcing END`)
    nextAgent = 'END'
  }
  // RULE 2: If supervisor provided a message but routing to self, end
  else if (parsed.message && (nextAgent === 'supervisor' || !nextAgent)) {
    console.log(`[Supervisor] Has message but routing to self - forcing END`)
    nextAgent = 'END'
  }

  // Extract game references from conversation (like "Disco Elysium", "Fallout 2", etc.)
  const lastUserMessage = [...state.messages].reverse().find(m => m._getType() === 'human')
  let referenceGames = [...(state.referenceGames || [])]
  let gameDescription = state.gameDescription

  if (lastUserMessage) {
    const msgContent = typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : JSON.stringify(lastUserMessage.content)

    // Common game references - extract from message
    const gamePatterns = [
      /disco\s*elysium/gi,
      /case\s*of\s*(?:the\s*)?golden\s*idol/gi,
      /fallout\s*\d*/gi,
      /vampire\s*survivors?/gi,
      /hades/gi,
      /slay\s*the\s*spire/gi,
      /balatro/gi,
      /darkest\s*dungeon/gi,
      /tarkov/gi,
      /escape\s*from\s*tarkov/gi,
      /hunt:?\s*showdown/gi,
      /stardew\s*valley/gi,
      /hollow\s*knight/gi,
      /celeste/gi,
      /elden\s*ring/gi,
      /dark\s*souls?\s*\d*/gi,
      /returnal/gi,
      /dead\s*cells/gi,
      /binding\s*of\s*isaac/gi,
    ]

    for (const pattern of gamePatterns) {
      const matches = msgContent.match(pattern)
      if (matches) {
        for (const match of matches) {
          const normalized = match.trim()
          if (!referenceGames.some(g => g.toLowerCase() === normalized.toLowerCase())) {
            referenceGames.push(normalized)
          }
        }
      }
    }

    // If user describes a game concept and we don't have a description, capture it
    if (!gameDescription && msgContent.length > 20) {
      gameDescription = msgContent
    }
  }

  // Build result
  const result: Partial<LoopCreatorState> = {
    nextAgent: nextAgent as NextAgent,
    currentPhase: parsed.nextPhase,
    referenceGames: referenceGames.length > (state.referenceGames?.length || 0) ? referenceGames : undefined,
    gameDescription: gameDescription !== state.gameDescription ? gameDescription : undefined,
  }

  // Add message if provided
  if (parsed.message) {
    result.messages = [
      new AIMessage({
        content: parsed.message,
        name: 'supervisor',
      }),
    ]
  }

  // Add questions if provided
  if (parsed.questions && parsed.questions.length > 0) {
    result.pendingQuestions = parsed.questions.map(q => ({
      id: q.id || uuidv4(),
      question: q.question,
      options: q.options,
      required: q.required ?? false,
    }))
  }

  // Add actions if provided (for canvas modifications)
  if (parsed.actions && parsed.actions.length > 0) {
    console.log(`[Supervisor] Emitting ${parsed.actions.length} actions:`, parsed.actions.map(a => a.type))
    result.pendingActions = parsed.actions.map(action => ({
      type: action.type as LoopAgentActionType,
      payload: action.payload,
      confidence: 1.0,
      reasoning: parsed.thinking,
    }))
  }

  return result
}
