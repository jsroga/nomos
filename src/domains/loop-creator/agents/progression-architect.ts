/**
 * Progression Architect Agent
 *
 * Designs progression systems by:
 * - Creating skill/power progression curves
 * - Defining milestones and unlocks
 * - Balancing progression pacing
 * - Connecting progression to core loops
 */

import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { LoopCreatorState, ProgressionSystem, LoopAgentAction, NextAgent } from '../core/graph/state'
import { v4 as uuidv4 } from 'uuid'

const PROGRESSION_ARCHITECT_SYSTEM_PROMPT = `You are a Progression Architect - an expert in designing compelling player progression systems.

## Your Expertise
- Progression curve design
- Milestone and unlock systems
- Player motivation through advancement
- Long-term engagement mechanics

## Your Task
{{TASK}}

## Current Game Context
Genre: {{GENRE}}
Platform: {{PLATFORM}}
Target Audience: {{AUDIENCE}}
Description: {{DESCRIPTION}}

## Current Mechanics
{{MECHANICS}}

## Current Loops
{{LOOPS}}

## Existing Progression Systems
{{PROGRESSIONS}}

## Guidelines
1. **Curve Selection**: Match curve type to game pacing
   - linear: Consistent, predictable growth
   - exponential: Increasing challenge/reward
   - logarithmic: Early gains, slower late game
   - s-curve: Slow start, rapid middle, slow end
   - stepped: Discrete levels/tiers

2. **Milestone Pacing**: 
   - Early milestones: 5-30 minutes
   - Mid milestones: 1-5 hours
   - Late milestones: 10-50 hours

3. **Unlocks**: New mechanics/content keep engagement
4. **Player Motivation**: What drives players at each stage
5. **Connection to Loops**: Progression should enhance core loops

## Progression Types
- **skill**: Player skill improvement
- **power**: Character/item power increases
- **content**: New areas/modes/features
- **social**: Social features and status
- **collection**: Collectibles and completionism

## Response Format
Respond with JSON:
{
  "analysis": "Your design thinking",
  "progressionSystems": [
    {
      "id": "unique-id",
      "name": "System Name",
      "type": "skill|power|content|social|collection",
      "milestones": [
        {
          "id": "milestone-id",
          "name": "Milestone Name",
          "requiredEffort": 2,
          "unlocksFeatures": ["What this unlocks"],
          "rewardType": "Type of reward",
          "playerMotivation": "Why player wants this"
        }
      ],
      "curve": "linear|exponential|logarithmic|s-curve|stepped"
    }
  ],
  "recommendations": ["Design recommendations"],
  "message": "Summary for the user"
}`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList =
    state.mechanics.length > 0
      ? state.mechanics.map(m => `- ${m.name} (${m.type})`).join('\n')
      : 'No mechanics defined'

  const loopsList =
    state.loops.length > 0
      ? state.loops.map(l => `- ${l.name} (${l.type}): ${l.duration.typical}min cycle`).join('\n')
      : 'No loops defined'

  const progressionsList =
    state.progressionSystems.length > 0
      ? state.progressionSystems
          .map(p => `- ${p.name} (${p.type}): ${p.milestones.length} milestones, ${p.curve} curve`)
          .join('\n')
      : 'No progression systems yet'

  return PROGRESSION_ARCHITECT_SYSTEM_PROMPT.replace(
    '{{GENRE}}',
    state.gameGenre || 'Not specified'
  )
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', state.gameDescription || 'Not specified')
    .replace('{{MECHANICS}}', mechanicsList)
    .replace('{{LOOPS}}', loopsList)
    .replace('{{PROGRESSIONS}}', progressionsList)
}

/**
 * Parse agent response
 */
interface ProgressionArchitectResponse {
  analysis: string
  progressionSystems: ProgressionSystem[]
  recommendations: string[]
  message: string
}

function parseResponse(content: string): ProgressionArchitectResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        analysis: parsed.analysis || '',
        progressionSystems: (parsed.progressionSystems || []).map((p: any) => ({
          id: p.id || uuidv4(),
          name: p.name || 'Unnamed Progression',
          type: p.type || 'power',
          milestones: (p.milestones || []).map((m: any) => ({
            id: m.id || uuidv4(),
            name: m.name || 'Unnamed Milestone',
            requiredEffort: m.requiredEffort ?? 1,
            unlocksFeatures: m.unlocksFeatures || [],
            rewardType: m.rewardType || 'Unknown',
            playerMotivation: m.playerMotivation || '',
          })),
          curve: p.curve || 'linear',
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
    progressionSystems: [],
    recommendations: [],
    message: content,
  }
}

/**
 * Main progression architect agent function
 */
export async function progressionArchitectAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.5,
  })

  // Get the task
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg
    ? typeof lastHumanMsg.content === 'string'
      ? lastHumanMsg.content
      : 'Design progression'
    : 'Design progression systems that enhance the core game loops'

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  const messages = [new SystemMessage(systemPrompt), ...state.messages.slice(-5)]

  const response = await model.invoke(messages)
  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const parsed = parseResponse(content)

  console.log(
    `[ProgressionArchitect] Created ${parsed.progressionSystems.length} progression systems`
  )

  // Create actions
  const actions: LoopAgentAction[] = parsed.progressionSystems.map(p => ({
    type: 'ADD_PROGRESSION_SYSTEM' as const,
    payload: p,
    confidence: 0.8,
    reasoning: parsed.analysis,
  }))

  // Build user message
  let userMessage =
    parsed.message || `Designed ${parsed.progressionSystems.length} progression system(s).`

  if (parsed.progressionSystems.length > 0) {
    userMessage += '\n\n**Progression Systems:**\n'
    for (const system of parsed.progressionSystems) {
      userMessage += `\n📈 **${system.name}** (${system.type}, ${system.curve} curve)\n`
      userMessage += `   ${system.milestones.length} milestones:\n`
      system.milestones.slice(0, 3).forEach((m, i) => {
        userMessage += `   ${i + 1}. ${m.name} (~${m.requiredEffort}h) - ${m.playerMotivation}\n`
      })
      if (system.milestones.length > 3) {
        userMessage += `   ... and ${system.milestones.length - 3} more milestones\n`
      }
    }
  }

  return {
    progressionSystems: [...state.progressionSystems, ...parsed.progressionSystems],
    pendingActions: actions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content: userMessage,
        name: 'progression_architect',
      }),
    ],
  }
}
