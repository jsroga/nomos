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
import { LoopCreatorState, GameLoop, LoopAgentAction, NextAgent } from '../graph/state'
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

## MANDATORY PSYCHOLOGICAL ORDER
Every loop MUST follow this exact psychological sequence (based on dopamine/motivation science):

**1. CHALLENGE (Seek/Stimulus)** → **2. ACTION (Dopamine/Response)** → **3. FEEDBACK (Experience/Reward)**

This is NON-NEGOTIABLE. The brain's reward system requires this order:
- CHALLENGE: Creates anticipation, triggers seeking behavior (dopamine rises)
- ACTION: Player engages, dopamine peaks during the action itself
- FEEDBACK: Result/reward, satisfaction, loop closure

### Rules for Psychological Order:
1. Every loop output MUST show nodes in this sequence: Challenge → Action → Feedback
2. You can have MULTIPLE challenges before actions (e.g., Challenge1 → Challenge2 → Action → Feedback)
3. You can have MULTIPLE actions (e.g., Challenge → Action1 → Action2 → Feedback)
4. But the ORDER must always be: all Challenges FIRST, then all Actions, then Feedback
5. If a loop has more than 5-6 nodes, SPLIT it into 2 separate loops (e.g., Core Loop + Session Loop)

### Loop Timeframe Grouping:
- **Micro Loop** (1-10 seconds): Single interaction cycle
- **Core Loop** (10-60 seconds): Primary gameplay moment
- **Session Loop** (5-30 minutes): Within a play session
- **Meta Loop** (hours/days): Between sessions, progression

## REQUESTED TIMEFRAMES
The user has selected these specific timeframes to create: {{SELECTED_TIMEFRAMES}}
Create ONLY loops for the selected timeframes. Do NOT create loops for timeframes not listed above.

## Guidelines
1. **Core Loop First**: Always establish the core moment-to-moment loop
2. **Layer Appropriately**: Build session and meta loops on top
3. **Player Experience**: Focus on what the player feels
4. **Time Awareness**: Consider how long each loop cycle takes
5. **Satisfaction Peaks**: Identify when players feel most satisfied
6. **Psychological Integrity**: NEVER break the Challenge → Action → Feedback order

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

Each loop MUST contain nodes that follow the psychological order: Challenge → Action → Feedback.
Group loops by timeframe (micro/core/session/meta).

REQUIRED JSON FORMAT:
{
  "analysis": "Your analysis including how the psychological flow works in this design",
  "loops": [
    {
      "id": "unique-id-1",
      "name": "Specific Loop Name (not generic)",
      "type": "core",
      "timeframe": "micro|core|session|meta",
      "description": "Detailed description of what this loop involves",
      "nodes": [
        { "name": "Node Name", "psychPhase": "challenge", "description": "What happens" },
        { "name": "Node Name", "psychPhase": "action", "description": "What player does" },
        { "name": "Node Name", "psychPhase": "feedback", "description": "Result/reward" }
      ],
      "duration": { "min": 1, "max": 5, "typical": 3, "unit": "seconds|minutes" },
      "playerExperience": "What the player feels at each phase",
      "satisfactionPeak": "When satisfaction is highest (usually at feedback)"
    }
  ],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
  "message": "Summary explaining the psychological flow of each loop"
}

### EXAMPLE - Disco Elysium Style:
{
  "loops": [
    {
      "id": "dialogue-loop",
      "name": "Dialogue Skill Check",
      "type": "core",
      "timeframe": "micro",
      "nodes": [
        { "name": "Conversation Choice", "psychPhase": "challenge", "description": "NPC presents dilemma, player sees skill check odds" },
        { "name": "Commit to Response", "psychPhase": "action", "description": "Player selects dialogue option, dice roll animation" },
        { "name": "Consequence Reveal", "psychPhase": "feedback", "description": "Success/failure shown, NPC reacts, world state changes" }
      ],
      "duration": { "min": 10, "max": 60, "typical": 30, "unit": "seconds" }
    }
  ]
}

REMEMBER: 
- Output ONLY the JSON object. No text before or after.
- EVERY loop must have nodes in order: challenge(s) → action(s) → feedback
- If you need more than 6 nodes, SPLIT into separate loops`

/**
 * Build context for the agent
 */
function buildContext(state: LoopCreatorState): string {
  const mechanicsList =
    state.mechanics.length > 0
      ? state.mechanics.map(m => `- ${m.id}: ${m.name} (${m.type})`).join('\n')
      : 'No mechanics defined yet'

  // Include reference games in description for better context
  let description = state.gameDescription || 'Not specified'
  if (state.referenceGames && state.referenceGames.length > 0) {
    description += `\nReference Games: ${state.referenceGames.join(', ')}`
  }

  // Get selected timeframes or default to all
  const timeframes =
    state.selectedTimeframes?.length > 0
      ? state.selectedTimeframes.join(', ')
      : 'micro, core, session, meta (all)'

  return LOOP_PLANNER_SYSTEM_PROMPT.replace('{{GENRE}}', state.gameGenre || 'Not specified')
    .replace('{{PLATFORM}}', state.gamePlatform || 'Not specified')
    .replace('{{AUDIENCE}}', state.targetAudience || 'Not specified')
    .replace('{{DESCRIPTION}}', description)
    .replace('{{MECHANICS}}', mechanicsList)
    .replace('{{SELECTED_TIMEFRAMES}}', timeframes)
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
        nodes: l.nodes || [], // Preserve psychological phase nodes
        timeframe: l.timeframe || l.type, // Preserve timeframe
      }))

      console.log(
        `[LoopPlanner] Parsed ${loops.length} loops:`,
        loops.map((l: GameLoop) => l.name)
      )

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
    ? typeof lastHumanMsg.content === 'string'
      ? lastHumanMsg.content
      : 'Design the game loop structure'
    : 'Design the initial game loop structure based on the game context'

  console.log('[LoopPlanner] Task:', task.slice(0, 100))
  console.log('[LoopPlanner] Game context:', state.gameDescription?.slice(0, 100) || 'None')

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  const messages = [new SystemMessage(systemPrompt), ...state.messages.slice(-5)]

  console.log('[LoopPlanner] Calling LLM...')
  const response = await model.invoke(messages)
  console.log('[LoopPlanner] LLM response received')

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  console.log('[LoopPlanner] Response length:', content.length)

  const parsed = parseResponse(content)

  console.log(`[LoopPlanner] Created ${parsed.loops.length} loops`)

  // Convert loops to canvas node actions with psychological ordering
  // SMART LAYOUT: Groups arranged HORIZONTALLY by timeframe (left to right)
  // Nodes within groups arranged VERTICALLY (top to bottom: challenge → action → feedback)
  const nodeActions: LoopAgentAction[] = []

  // Layout constants - GENEROUS SPACING for readability
  const GROUP_WIDTH = 420
  const GROUP_GAP = 150
  const NODE_WIDTH = 320
  const NODE_HEIGHT = 220
  const NODE_GAP_Y = 80
  const GROUP_PADDING = 80
  const GROUP_HEADER_HEIGHT = 80

  // Map psychological phases to node types
  const phaseToNodeType: Record<string, string> = {
    challenge: 'challenge',
    action: 'action',
    feedback: 'reward', // feedback maps to reward visually
  }

  // Timeframe order for horizontal positioning (left to right)
  const timeframeOrder = ['micro', 'core', 'session', 'meta', 'progression']

  // Sort loops by timeframe
  const sortedLoops = [...parsed.loops].sort((a, b) => {
    const aTimeframe = a.timeframe || a.type
    const bTimeframe = b.timeframe || b.type
    return timeframeOrder.indexOf(aTimeframe) - timeframeOrder.indexOf(bTimeframe)
  })

  // Track group positions for inter-group edges
  const groupPositions: Record<string, { x: number; y: number; width: number; height: number }> = {}

  // Process each loop and create GROUPS HORIZONTALLY
  let currentGroupX = 50

  for (const loop of sortedLoops) {
    const loopNodes = loop.nodes || []
    const timeframe = loop.timeframe || loop.type
    const durationUnit = (loop.duration as { unit?: string })?.unit || 'seconds'

    // Sort nodes by psychological order
    const phaseOrder = ['challenge', 'action', 'feedback']
    const sortedNodes = [...loopNodes].sort((a: any, b: any) => {
      const aIdx = phaseOrder.indexOf(a.psychPhase || 'action')
      const bIdx = phaseOrder.indexOf(b.psychPhase || 'action')
      return aIdx - bIdx
    })

    // Calculate group height based on number of nodes
    const nodeCount = Math.max(sortedNodes.length, 1)
    const groupHeight =
      GROUP_HEADER_HEIGHT +
      GROUP_PADDING * 2 +
      nodeCount * NODE_HEIGHT +
      (nodeCount - 1) * NODE_GAP_Y

    // Create a group/container node
    const groupId = `group-${loop.id}`
    groupPositions[loop.id] = { x: currentGroupX, y: 50, width: GROUP_WIDTH, height: groupHeight }

    nodeActions.push({
      type: 'ADD_NODE',
      payload: {
        id: groupId,
        label: `${loop.name}`,
        description: `${loop.description}\n\n⏱️ ${loop.duration?.typical || '?'} ${durationUnit}`,
        nodeType: 'group',
        position: { x: currentGroupX, y: 50 },
        timeframe,
        loopData: {
          type: loop.type,
          timeframe,
          duration: loop.duration,
          playerExperience: loop.playerExperience,
          satisfactionPeak: loop.satisfactionPeak,
        },
      },
      confidence: 0.85,
      reasoning: `${timeframe.toUpperCase()} LOOP: ${loop.name}`,
    })

    // Create nodes VERTICALLY within the group
    const nodeIds: string[] = []
    const nodeCenterX = currentGroupX + GROUP_WIDTH / 2 - NODE_WIDTH / 2
    let nodeY = 50 + GROUP_HEADER_HEIGHT + GROUP_PADDING

    for (const node of sortedNodes) {
      const nodeId = `${loop.id}-${node.name?.replace(/\s+/g, '-').toLowerCase() || uuidv4()}`
      const psychPhase = node.psychPhase || 'action'
      const nodeType = phaseToNodeType[psychPhase] || 'action'

      nodeActions.push({
        type: 'ADD_NODE',
        payload: {
          id: nodeId,
          label: node.name,
          description: node.description,
          nodeType,
          position: { x: nodeCenterX, y: nodeY },
          parentId: groupId,
          psychPhase,
          timeframe,
        },
        confidence: 0.85,
        reasoning: `${psychPhase.toUpperCase()}: ${node.description?.slice(0, 40) || node.name}`,
      })

      nodeIds.push(nodeId)
      nodeY += NODE_HEIGHT + NODE_GAP_Y
    }

    // Create VERTICAL edges connecting nodes (challenge → action → feedback)
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const sourcePhase = sortedNodes[i]?.psychPhase || 'challenge'
      const targetPhase = sortedNodes[i + 1]?.psychPhase || 'action'

      nodeActions.push({
        type: 'ADD_EDGE',
        payload: {
          id: `edge-${nodeIds[i]}-${nodeIds[i + 1]}`,
          source: nodeIds[i],
          target: nodeIds[i + 1],
          label: '', // Clean look - no label for vertical flow
          sourceHandle: 'bottom',
          targetHandle: 'top',
        },
        confidence: 0.9,
        reasoning: `${sourcePhase} → ${targetPhase}`,
      })
    }

    // Loop closure edge (feedback → challenge, wrapping around)
    if (nodeIds.length >= 2) {
      nodeActions.push({
        type: 'ADD_EDGE',
        payload: {
          id: `edge-loop-${nodeIds[nodeIds.length - 1]}-${nodeIds[0]}`,
          source: nodeIds[nodeIds.length - 1],
          target: nodeIds[0],
          label: '↺',
          style: 'dashed',
          sourceHandle: 'right-out',
          targetHandle: 'right-in',
        },
        confidence: 0.8,
        reasoning: 'Loop closure: feeds back to start',
      })
    }

    // Move to next group position (horizontal)
    currentGroupX += GROUP_WIDTH + GROUP_GAP
  }

  // Connect groups HORIZONTALLY (micro → core → session → meta)
  for (let i = 0; i < sortedLoops.length - 1; i++) {
    const sourceLoop = sortedLoops[i]
    const targetLoop = sortedLoops[i + 1]
    const sourceTimeframe = sourceLoop.timeframe || sourceLoop.type
    const targetTimeframe = targetLoop.timeframe || targetLoop.type

    nodeActions.push({
      type: 'ADD_EDGE',
      payload: {
        id: `edge-group-${sourceLoop.id}-${targetLoop.id}`,
        source: `group-${sourceLoop.id}`,
        target: `group-${targetLoop.id}`,
        label: '→', // Clean arrow
        style: 'thick',
        animated: true,
      },
      confidence: 0.8,
      reasoning: `${sourceTimeframe} feeds into ${targetTimeframe}`,
    })
  }

  return {
    loops: parsed.loops,
    pendingActions: nodeActions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content:
          parsed.message ||
          `Created ${parsed.loops.length} game loops with ${nodeActions.length} canvas elements.`,
        name: 'loop_planner',
      }),
    ],
  }
}
