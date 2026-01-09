/**
 * Mechanics Designer Agent
 * 
 * Creates individual game mechanics with:
 * - Clear inputs and outputs
 * - Balance factors (effort, reward, frequency)
 * - Examples from reference games
 */

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { 
  LoopCreatorState, 
  MechanicNode, 
  MechanicEdge,
  LoopAgentAction,
  NextAgent 
} from '../graph/state'
import { v4 as uuidv4 } from 'uuid'

const MECHANICS_DESIGNER_SYSTEM_PROMPT = `You are a Game Mechanics Designer - an expert in creating compelling gameplay mechanics.

## Your Expertise
- Core mechanics design
- Input/output systems
- Balance factor tuning
- Mechanic interconnections

## Your Task
{{TASK}}

## Current Game Context
Genre: {{GENRE}}
Platform: {{PLATFORM}}
Target Audience: {{AUDIENCE}}
Description: {{DESCRIPTION}}

## Existing Mechanics
{{MECHANICS}}

## Existing Connections
{{CONNECTIONS}}

## Guidelines
1. **Clear I/O**: Every mechanic must have clear inputs and outputs
2. **Balance Factors**: Set effort (1-10), reward (1-10), frequency
3. **Connect Mechanics**: Outputs should feed into other mechanics' inputs
4. **Type Appropriately**: core, secondary, meta, progression, or reward
5. **Examples**: Provide examples from real games when possible

## Mechanic Types
- **core**: Central gameplay mechanics (movement, combat, building)
- **secondary**: Supporting mechanics (inventory, crafting)
- **meta**: Meta-game mechanics (achievements, collections)
- **progression**: Character/skill progression
- **reward**: Reward delivery mechanisms

## Response Format
Respond with JSON:
{
  "analysis": "Your analysis and design thinking",
  "mechanics": [
    {
      "id": "unique-id",
      "name": "Mechanic Name",
      "type": "core|secondary|meta|progression|reward",
      "description": "What this mechanic does",
      "inputs": ["What triggers/feeds this"],
      "outputs": ["What this produces"],
      "balanceFactors": {
        "effort": 5,
        "reward": 7,
        "frequency": 10
      },
      "examples": ["Examples from other games"]
    }
  ],
  "connections": [
    {
      "id": "conn-id",
      "source": "mechanic-id",
      "target": "mechanic-id",
      "type": "triggers|enables|requires|conflicts|enhances",
      "label": "Connection description"
    }
  ],
  "message": "Summary for the user"
}`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList = state.mechanics.length > 0
    ? state.mechanics.map(m => 
        `- ${m.id}: ${m.name} (${m.type}) - Inputs: [${m.inputs.join(', ')}], Outputs: [${m.outputs.join(', ')}]`
      ).join('\n')
    : 'No mechanics defined yet'
  
  const connectionsList = state.connections.length > 0
    ? state.connections.map(c => `- ${c.source} --${c.type}--> ${c.target}`).join('\n')
    : 'No connections defined yet'
  
  return MECHANICS_DESIGNER_SYSTEM_PROMPT
    .replace('{{GENRE}}', state.gameGenre || 'Not specified')
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', state.gameDescription || 'Not specified')
    .replace('{{MECHANICS}}', mechanicsList)
    .replace('{{CONNECTIONS}}', connectionsList)
}

/**
 * Parse agent response
 */
interface MechanicsDesignerResponse {
  analysis: string
  mechanics: MechanicNode[]
  connections: MechanicEdge[]
  message: string
}

function parseResponse(content: string): MechanicsDesignerResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        analysis: parsed.analysis || '',
        mechanics: (parsed.mechanics || []).map((m: any) => ({
          id: m.id || uuidv4(),
          name: m.name || 'Unnamed Mechanic',
          type: m.type || 'core',
          description: m.description || '',
          inputs: m.inputs || [],
          outputs: m.outputs || [],
          balanceFactors: {
            effort: m.balanceFactors?.effort ?? 5,
            reward: m.balanceFactors?.reward ?? 5,
            frequency: m.balanceFactors?.frequency ?? 5,
          },
          examples: m.examples || [],
        })),
        connections: (parsed.connections || []).map((c: any) => ({
          id: c.id || uuidv4(),
          source: c.source,
          target: c.target,
          type: c.type || 'triggers',
          label: c.label,
        })),
        message: parsed.message || '',
      }
    } catch {
      // Fall through
    }
  }
  
  return {
    analysis: content,
    mechanics: [],
    connections: [],
    message: content,
  }
}

/**
 * Main mechanics designer agent function
 */
export async function mechanicsDesignerAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.5,
  })
  
  // Get the task from the last human message or use default
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg 
    ? (typeof lastHumanMsg.content === 'string' ? lastHumanMsg.content : 'Design game mechanics')
    : 'Design core game mechanics based on the game context'
  
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
  
  console.log(`[MechanicsDesigner] Created ${parsed.mechanics.length} mechanics, ${parsed.connections.length} connections`)
  
  // Create actions for the mechanics
  const actions: LoopAgentAction[] = [
    ...parsed.mechanics.map(m => ({
      type: 'ADD_MECHANIC' as const,
      payload: m,
      confidence: 0.8,
      reasoning: parsed.analysis,
    })),
    ...parsed.connections.map(c => ({
      type: 'ADD_CONNECTION' as const,
      payload: c,
      confidence: 0.8,
      reasoning: parsed.analysis,
    })),
  ]
  
  return {
    mechanics: parsed.mechanics,
    connections: parsed.connections,
    pendingActions: actions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content: parsed.message || `Created ${parsed.mechanics.length} mechanics with ${parsed.connections.length} connections.`,
        name: 'mechanics_designer',
      }),
    ],
  }
}

