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
import { LoopCreatorState, NextAgent, LoopCreatorPhase, LoopAgentQuestion } from '../graph/state'
import { v4 as uuidv4 } from 'uuid'

const SUPERVISOR_SYSTEM_PROMPT = `You are a Game Loop Design Supervisor - an expert orchestrator for designing compelling gameplay loops.

## Your Role
You coordinate a team of specialists to help users design game mechanics and loops:
- **Loop Planner**: Designs overall loop structure and identifies core/meta loops
- **Mechanics Designer**: Creates individual game mechanics with inputs/outputs
- **Balance Analyst**: Evaluates effort/reward balance and identifies issues
- **Progression Architect**: Designs progression systems and milestones

## Your Responsibilities
1. **Understand Intent**: Parse what the user wants to accomplish
2. **Route Tasks**: Delegate to the right specialist for the current need
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
  "nextAgent": "supervisor|loop_planner|mechanics_designer|balance_analyst|progression_architect|END",
  "nextPhase": "current phase or new phase",
  "message": "Your message to the user (optional if delegating)",
  "questions": [{ "id": "uuid", "question": "...", "options": [...], "required": true }],
  "taskForAgent": "If delegating, what should the agent do"
}

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
  
  parts.push(`\nMechanics: ${state.mechanics.length}`)
  if (state.mechanics.length > 0) {
    state.mechanics.slice(0, 5).forEach(m => {
      const desc = m.description ? m.description.slice(0, 50) + '...' : 'No description'
      parts.push(`  - ${m.name || 'Unnamed'} (${m.type || 'unknown'}): ${desc}`)
    })
    if (state.mechanics.length > 5) {
      parts.push(`  ... and ${state.mechanics.length - 5} more`)
    }
  }
  
  parts.push(`Connections: ${state.connections.length}`)
  parts.push(`Loops: ${state.loops.length}`)
  parts.push(`Progression Systems: ${state.progressionSystems.length}`)
  
  if (state.balanceAnalysis) {
    parts.push(`Balance Score: ${state.balanceAnalysis.overallScore}/10`)
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
}

function parseResponse(content: string): SupervisorResponse {
  // Try to extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // Fall through to defaults
    }
  }
  
  // Default response
  return {
    thinking: 'Unable to parse structured response',
    nextAgent: 'supervisor',
    nextPhase: 'initial',
    message: content,
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
  
  // Build system prompt with context
  const systemPrompt = SUPERVISOR_SYSTEM_PROMPT.replace(
    '{{STATE_CONTEXT}}',
    buildStateContext(state)
  )
  
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
  
  // Build result
  const result: Partial<LoopCreatorState> = {
    nextAgent: parsed.nextAgent,
    currentPhase: parsed.nextPhase,
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
  
  return result
}

