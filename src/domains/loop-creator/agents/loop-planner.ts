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
4. **Time Awareness**: Consider how long each loop cycle takes (Moment, Action, Mission, or Session)
5. **Satisfaction Peaks**: Identify when players feel most satisfied
6. **Pattern Sequence**: Ensure every loop structure can be broken down into: **Challenge ➔ Action ➔ Feedback ➔ Reward**.

## INNOVATION MANDATE
Design loop structures that could DEFINE a new genre, not just iterate on existing ones.

LOOP ARCHITECTURE INNOVATIONS (what made them genre-defining):

1. **Vampire Survivors Loop Structure**
   - Core (3s): Move to dodge, auto-attacks kill
   - Session (30min): Build toward godlike power fantasy
   - Meta: Unlock new characters/weapons
   - Innovation: REMOVED the attack loop entirely, compressed to movement only

2. **Roguelike Loop Structure**  
   - Core (10s): Combat/exploration decision
   - Session (45min): Risk/reward through dungeon depth
   - Meta: Knowledge persistence (you learn, character doesn't)
   - Innovation: Death IS the loop, not a failure state

3. **Extraction Shooter Loop Structure**
   - Core (1min): Tactical engagement
   - Session (20min): Escalating tension to extraction
   - Meta: Gear economy and progression
   - Innovation: Extraction as CLIMAX, not just "exit"

4. **Idle/Incremental Loop Structure**
   - Core (passive): Numbers go up automatically
   - Session (varies): Optimization decisions
   - Meta: Prestige resets for multipliers
   - Innovation: Satisfaction from NOT playing

LOOP INNOVATION STRATEGIES:
- **Compress**: Can you remove an entire loop layer? (VS removed combat loop)
- **Invert**: Make failure a core progression mechanism (roguelikes)
- **Shift climax**: Move satisfaction peak to unexpected moment (extraction)
- **Parallelize**: Multiple loops running simultaneously at different timescales
- **Externalize**: Player progress outside the game (knowledge, skill)

AVOID:
- Generic loop names like "Main Loop" or "Gameplay Loop"
- Loops that exist because "every game has them"
- Session lengths copied from similar games without justification

## CRITICAL: Response Format
You MUST respond with valid JSON and NOTHING ELSE. No explanation text before or after.
The JSON must include at least 3 loops (core, session, meta).

REQUIRED JSON FORMAT:
{
  "analysis": "Your analysis of the current state and what's needed",
  "loops": [
    {
      "id": "unique-id-1",
      "name": "Specific Loop Name (not generic)",
      "type": "core",
      "description": "Detailed description of what this loop involves",
      "mechanics": [],
      "duration": { "min": 1, "max": 5, "typical": 3 },
      "playerExperience": "What the player feels",
      "satisfactionPeak": "When satisfaction is highest"
    },
    {
      "id": "unique-id-2", 
      "name": "Session Loop Name",
      "type": "session",
      "description": "Detailed description",
      "mechanics": [],
      "duration": { "min": 10, "max": 30, "typical": 20 },
      "playerExperience": "What the player feels",
      "satisfactionPeak": "When satisfaction peaks"
    },
    {
      "id": "unique-id-3",
      "name": "Meta Loop Name", 
      "type": "meta",
      "description": "Detailed description",
      "mechanics": [],
      "duration": { "min": 60, "max": 180, "typical": 120 },
      "playerExperience": "What the player feels",
      "satisfactionPeak": "When satisfaction peaks"
    }
  ],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
  "message": "Summary for the user explaining what was created"
}

REMEMBER: Output ONLY the JSON object. No text before. No text after. Just the JSON.`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList = state.mechanics.length > 0
    ? state.mechanics.map(m => `- ${m.id}: ${m.name} (${m.type})`).join('\n')
    : 'No mechanics defined yet'

  // Include reference games in description for better context
  let description = state.gameDescription || 'Not specified'
  if (state.referenceGames && state.referenceGames.length > 0) {
    description += `\nReference Games: ${state.referenceGames.join(', ')}`
  }

  return LOOP_PLANNER_SYSTEM_PROMPT
    .replace('{{GENRE}}', state.gameGenre || 'Not specified')
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', description)
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
  console.log('[LoopPlanner] Parsing response...')

  // Try to find JSON in the response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('[LoopPlanner] Successfully parsed JSON')

      const loops = (parsed.loops || []).map((l: any) => ({
        id: l.id || uuidv4(),
        name: l.name || 'Unnamed Loop',
        type: l.type || 'core',
        description: l.description || '',
        mechanics: l.mechanics || [],
        duration: l.duration || { min: 1, max: 10, typical: 5 },
        playerExperience: l.playerExperience || '',
        satisfactionPeak: l.satisfactionPeak || '',
      }))

      console.log(`[LoopPlanner] Parsed ${loops.length} loops:`, loops.map((l: GameLoop) => l.name))

      return {
        analysis: parsed.analysis || '',
        loops,
        recommendations: parsed.recommendations || [],
        message: parsed.message || '',
      }
    } catch (e) {
      console.error('[LoopPlanner] JSON parse error:', e)
      console.error('[LoopPlanner] Raw content:', content.slice(0, 500))
    }
  } else {
    console.error('[LoopPlanner] No JSON found in response!')
    console.error('[LoopPlanner] Raw content:', content.slice(0, 500))
  }

  // If parsing failed, create fallback loops based on the game concept
  console.log('[LoopPlanner] Creating fallback loops...')
  return {
    analysis: content,
    loops: [
      {
        id: uuidv4(),
        name: 'Core Gameplay Loop',
        type: 'core' as const,
        description: 'Primary moment-to-moment gameplay',
        mechanics: [],
        duration: { min: 1, max: 5, typical: 3 },
        playerExperience: 'Immediate engagement',
        satisfactionPeak: 'Completing micro-objectives',
      },
      {
        id: uuidv4(),
        name: 'Session Loop',
        type: 'session' as const,
        description: 'Goals achievable within a play session',
        mechanics: [],
        duration: { min: 15, max: 45, typical: 30 },
        playerExperience: 'Progress toward larger goals',
        satisfactionPeak: 'Completing missions or levels',
      },
      {
        id: uuidv4(),
        name: 'Meta Progression Loop',
        type: 'meta' as const,
        description: 'Long-term progression across sessions',
        mechanics: [],
        duration: { min: 60, max: 300, typical: 120 },
        playerExperience: 'Character/story advancement',
        satisfactionPeak: 'Major milestones',
      },
    ],
    recommendations: ['Continue refining the loop structure'],
    message: content,
  }
}

/**
 * Main loop planner agent function
 */
export async function loopPlannerAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  console.log('[LoopPlanner] Starting...')

  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.5,
    modelKwargs: {
      response_format: { type: 'json_object' },
    },
  })

  // Get the task from the last human message or use default
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg
    ? (typeof lastHumanMsg.content === 'string' ? lastHumanMsg.content : 'Design the game loop structure')
    : 'Design the initial game loop structure based on the game context'

  console.log('[LoopPlanner] Task:', task.slice(0, 100))
  console.log('[LoopPlanner] Game context:', state.gameDescription?.slice(0, 100) || 'None')

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages.slice(-5),
  ]

  console.log('[LoopPlanner] Calling LLM...')
  const response = await model.invoke(messages)
  console.log('[LoopPlanner] LLM response received')

  const content = typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content)

  console.log('[LoopPlanner] Response length:', content.length)

  const parsed = parseResponse(content)

  console.log(`[LoopPlanner] Created ${parsed.loops.length} loops`)

  // Convert loops to canvas node actions so they appear as suggestions
  const nodeActions: LoopAgentAction[] = []
  let yOffset = 100

  for (const loop of parsed.loops) {
    // Create a group node for the loop
    nodeActions.push({
      type: 'ADD_NODE',
      payload: {
        id: loop.id,
        label: loop.name,
        description: loop.description,
        nodeType: loop.type === 'core' ? 'challenge' : loop.type === 'session' ? 'action' : 'reward',
        position: { x: 200, y: yOffset },
        loopData: {
          type: loop.type,
          duration: loop.duration,
          playerExperience: loop.playerExperience,
          satisfactionPeak: loop.satisfactionPeak,
        },
      },
      confidence: 0.8,
      reasoning: `${loop.type} loop: ${loop.playerExperience}`,
    })
    yOffset += 150
  }

  // Also create connections between loops (core -> session -> meta)
  const loopTypes = ['core', 'session', 'progression', 'meta']
  const sortedLoops = [...parsed.loops].sort((a, b) =>
    loopTypes.indexOf(a.type) - loopTypes.indexOf(b.type)
  )

  for (let i = 0; i < sortedLoops.length - 1; i++) {
    nodeActions.push({
      type: 'ADD_EDGE',
      payload: {
        id: `edge-${sortedLoops[i].id}-${sortedLoops[i + 1].id}`,
        source: sortedLoops[i].id,
        target: sortedLoops[i + 1].id,
        label: 'feeds into',
      },
      confidence: 0.8,
      reasoning: `${sortedLoops[i].type} loop feeds into ${sortedLoops[i + 1].type} loop`,
    })
  }

  return {
    loops: parsed.loops,
    pendingActions: nodeActions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content: parsed.message || `Created ${parsed.loops.length} game loops with ${nodeActions.length} canvas elements.`,
        name: 'loop_planner',
      }),
    ],
  }
}

