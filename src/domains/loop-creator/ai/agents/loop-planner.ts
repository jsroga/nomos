/**
 * Loop Planner Agent
 *
 * Designs overall game loop structure by:
 * - Identifying core, session, and meta loops
 * - Understanding player motivation cycles
 * - Creating high-level loop architecture
 */

import { assistantChatMessage, ChatMessageRole } from '@/shared/chat/core/message'
import { runLoopCreatorStructuredCompletion } from './mastra/loop-creator-completion'
import { LoopPlannerOutputSchema } from './schemas/loop-planner-output'
import { LoopCreatorMastraAgentId } from './mastra/loop-creator-mastra-agents'
import { LoopCreatorState, LoopAgentAction } from '../../core/graph/state'
import { buildCanvasActionsFromLoops } from '../utils/loop-planner-canvas'
import { parseLoopPlannerResponse } from '../utils/loop-planner-parse'

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

## Output
Each loop MUST contain nodes that follow the psychological order: Challenge → Action → Feedback.
Group loops by timeframe (micro / core / session / meta).
Every loop needs a specific name (not generic), type, timeframe, description, ordered nodes (name, psychPhase, description), duration (min/max/typical and unit), playerExperience, satisfactionPeak, analysis of the psychological flow, recommendations, and a short user-facing message.

Example (Disco Elysium): a micro Dialogue Skill Check — Conversation Choice (challenge) → Commit to Response (action) → Consequence Reveal (feedback), typically ~30 seconds.

EVERY loop must have nodes in order: challenge(s) → action(s) → feedback. If you need more than 6 nodes, SPLIT into separate loops.`

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
 * Main loop planner agent function
 */
export async function loopPlannerAgent(
  state: LoopCreatorState
): Promise<Partial<LoopCreatorState>> {
  console.log('[LoopPlanner] Starting...')

  // Get the task from the last human message or use default
  const lastHumanMsg = [...state.messages].reverse().find(m => m.role === ChatMessageRole.Human)
  const task = lastHumanMsg
    ? typeof lastHumanMsg.content === 'string'
      ? lastHumanMsg.content
      : 'Design the game loop structure'
    : 'Design the initial game loop structure based on the game context'

  console.log('[LoopPlanner] Task:', task.slice(0, 100))
  console.log('[LoopPlanner] Game context:', state.gameDescription?.slice(0, 100) || 'None')

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  console.log('[LoopPlanner] Calling LLM...')
  const output = await runLoopCreatorStructuredCompletion({
    scope: state.scope,
    agentId: LoopCreatorMastraAgentId.LoopPlanner,
    systemPrompt,
    history: state.messages.slice(-5),
    temperature: state.modelConfig?.temperature ?? 0.5,
    modelOverride: state.modelConfig?.model,
    traceId: state.traceId,
    parentSpanId: state.parentSpanId,
    schema: LoopPlannerOutputSchema,
  })
  console.log('[LoopPlanner] LLM response received')

  const parsed = parseLoopPlannerResponse(output)

  console.log(`[LoopPlanner] Created ${parsed.loops.length} loops`)

  const nodeActions: LoopAgentAction[] = buildCanvasActionsFromLoops(parsed.loops)

  return {
    loops: parsed.loops,
    pendingActions: nodeActions,
    nextAgent: 'supervisor',
    messages: [
      assistantChatMessage(
        parsed.message ||
          `Created ${parsed.loops.length} game loops with ${nodeActions.length} canvas elements.`,
        'loop_planner',
      ),
    ],
  }
}
