/**
 * Loop Planner Agent
 * 
 * Designs overall game loop structure by:
 * - Identifying core, session, and meta loops
 * - Understanding player motivation cycles
 * - Creating high-level loop architecture
 */

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { 
  LoopCreatorState, 
  GameLoop, 
  LoopAgentAction,
  NextAgent 
} from '../graph/state'
import { v4 as uuidv4 } from 'uuid'

const LOOP_PLANNER_SYSTEM_PROMPT = `You are a Game Loop Planner - an expert in designing engaging gameplay loop structures.

## Your Expertise
- Core loops (moment-to-moment gameplay)
- Session loops (within a play session)
- Meta/progression loops (between sessions)
- Engagement cycles and player motivation

## Your Task
{{TASK}}

## Current Game Context
Genre: {{GENRE}}
Platform: {{PLATFORM}}
Target Audience: {{AUDIENCE}}
Description: {{DESCRIPTION}}

## Existing Mechanics
{{MECHANICS}}

## Guidelines
1. **Core Loop First**: Always establish the core moment-to-moment loop
2. **Layer Appropriately**: Build session and meta loops on top
3. **Player Experience**: Focus on what the player feels
4. **Time Awareness**: Consider how long each loop cycle takes
5. **Satisfaction Peaks**: Identify when players feel most satisfied

## Response Format
Respond with JSON:
{
  "analysis": "Your analysis of the current state and what's needed",
  "loops": [
    {
      "id": "unique-id",
      "name": "Loop Name",
      "type": "core|session|progression|meta|social",
      "description": "What this loop involves",
      "mechanics": ["mechanic-ids that form this loop"],
      "duration": { "min": 1, "max": 5, "typical": 3 },
      "playerExperience": "What the player feels during this loop",
      "satisfactionPeak": "When satisfaction is highest"
    }
  ],
  "recommendations": ["List of recommendations for the design"],
  "message": "Summary for the user"
}`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList = state.mechanics.length > 0
    ? state.mechanics.map(m => `- ${m.id}: ${m.name} (${m.type})`).join('\n')
    : 'No mechanics defined yet'
  
  return LOOP_PLANNER_SYSTEM_PROMPT
    .replace('{{GENRE}}', state.gameGenre || 'Not specified')
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', state.gameDescription || 'Not specified')
    .replace('{{MECHANICS}}', mechanicsList)
}

/**
 * Parse agent response
 */
interface LoopPlannerResponse {
  analysis: string
  loops: GameLoop[]
  recommendations: string[]
  message: string
}

function parseResponse(content: string): LoopPlannerResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        analysis: parsed.analysis || '',
        loops: (parsed.loops || []).map((l: any) => ({
          id: l.id || uuidv4(),
          name: l.name || 'Unnamed Loop',
          type: l.type || 'core',
          description: l.description || '',
          mechanics: l.mechanics || [],
          duration: l.duration || { min: 1, max: 10, typical: 5 },
          playerExperience: l.playerExperience || '',
          satisfactionPeak: l.satisfactionPeak || '',
        })),
        recommendations: parsed.recommendations || [],
        message: parsed.message || '',
      }
    } catch {
      // Fall through
    }
  }
  
  return {
    analysis: content,
    loops: [],
    recommendations: [],
    message: content,
  }
}

/**
 * Main loop planner agent function
 */
export async function loopPlannerAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.5,
  })
  
  // Get the task from the last human message or use default
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg 
    ? (typeof lastHumanMsg.content === 'string' ? lastHumanMsg.content : 'Design the game loop structure')
    : 'Design the initial game loop structure based on the game context'
  
  const systemPrompt = buildContext(state).replace('{{TASK}}', task)
  
  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages.slice(-5),
  ]
  
  const response = await model.invoke(messages)
  const content = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content)
  
  const parsed = parseResponse(content)
  
  console.log(`[LoopPlanner] Created ${parsed.loops.length} loops`)
  
  // Create actions for the loops
  const actions: LoopAgentAction[] = parsed.loops.map(loop => ({
    type: 'CREATE_LOOP',
    payload: loop,
    confidence: 0.8,
    reasoning: parsed.analysis,
  }))
  
  return {
    loops: parsed.loops,
    pendingActions: actions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content: parsed.message || `Created ${parsed.loops.length} game loops.`,
        name: 'loop_planner',
      }),
    ],
  }
}

