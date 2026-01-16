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
  NextAgent,
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

## ⚠️ CRITICAL: CONCEPT ALIGNMENT ⚠️
The user referenced specific games in their description. You MUST capture the UNIQUE mechanics that define those games:

**If they mention "Disco Elysium":**
- Internal Thought Cabinet - skills that argue with each other in your head
- Passive skill checks during dialogue that reveal hidden options
- No combat - ALL challenge is through conversation and skill checks
- Failure is interesting - failed checks lead to unique story paths
- Character personality defined by skill investments

**If they mention "Vampire Survivors":**
- Auto-attack - player NEVER presses attack, only moves
- Exponential power fantasy - from 1 enemy to 1000 on screen
- Weapon evolution through item combos
- 30-minute runs with Death as final boss
- Screen-filling chaos by endgame

**If they mention "Hades":**
- Multiple weapon aspects with different playstyles
- Boon combinations that create builds
- Story that progresses through repeated deaths
- Character relationships that unlock through gifts
- The "escape attempt" as narrative frame

**If they mention "Slay the Spire":**
- Deckbuilding with card draft at shops/rewards
- Relics that fundamentally change strategy
- Three distinct acts with boss fights
- "Remove card" as powerful option
- No execution skill - pure strategy

ALWAYS include at least 3 mechanics that are UNIQUE to the referenced game, not generic RPG/action mechanics.

## Existing Mechanics
{{MECHANICS}}

## Existing Connections
{{CONNECTIONS}}

## Guidelines
1. **Clear I/O**: Every mechanic must have clear inputs and outputs
2. **Balance Factors**: Set effort (1-10), reward (1-10), frequency
3. **Connect Mechanics**: Outputs should feed into other mechanics' inputs
4. **Type Appropriately**: core, secondary, meta, progression, or reward
5. **Examples**: Provide examples from the REFERENCE GAME mentioned by the user

## Mechanic Types
- **core**: Central gameplay mechanics (movement, combat, building)
- **secondary**: Supporting mechanics (inventory, crafting)
- **meta**: Meta-game mechanics (achievements, collections)
- **progression**: Character/skill progression
- **reward**: Reward delivery mechanisms

## INNOVATION MANDATE
Design mechanics that could DEFINE a new genre, not just iterate on existing ones.

STRATEGIES - Consider which approach fits best:
1. **SUBVERT** - Flip genre cliches on their head
   - Vampire Survivors removed aiming entirely, focusing only on movement
   - Slay the Spire made "failure" (losing a run) feel like progress
   
2. **COMBINE** - Mashup mechanics from unrelated genres  
   - Roguelike + Deckbuilder = Slay the Spire
   - FPS + Extraction survival = Tarkov
   - Idle game + Tower Defense = unexpected synergy potential
   
3. **REDUCE** - Find the ONE satisfying core action, strip everything else
   - Vampire Survivors: movement is the entire skill expression
   - Flappy Bird: single tap, infinite depth
   
4. **AMPLIFY** - Take an overlooked mechanic and make it the star
   - Papers Please: document checking became the entire game
   - Unpacking: organization/decoration as core loop

REFERENCE INNOVATIONS (what made them genre-defining):
- Roguelike: permadeath made every choice feel weighty
- Extraction shooter: potential loss creates unbearable tension, extraction = emotional peak
- Survivors: zero skill floor + maximum power fantasy per second
- Deckbuilder roguelike: strategic depth without execution skill requirements
- Auto-battler: decision-making separated from execution

## 🔄 LOOP PATTERN MANDATE
Every loop design MUST follow this sequential pattern:
1. **CHALLENGE**: The obstacle or test (e.g., "Boss Fight", "Complex Puzzle")
2. **ACTION**: The player's response (e.g., "Combat Maneuvers", "Deduction")
3. **FEEDBACK**: The immediate response from the game (e.g., "Hit Markers", "Hint System")
4. **REWARD**: The payoff for success (e.g., "Loot", "Skill Point")

## 🧬 CONNECTIVITY RULES
- **Sequential Flow**: Connect nodes in the order: Challenge -> Action -> Feedback -> Reward.
- **Homogeneous Clusters**: If you have multiple nodes of the SAME type (e.g., two Challenges), you MUST connect them to each other FIRST (\`Challenge 1 -> Challenge 2\`) before moving to the next stage (\`Challenge 2 -> Action 1\`).
- **No Dead Ends**: Every node must have at least one input and one output within the loop.

## ⏱️ TIME AWARENESS (TIMEFRAMES)
You MUST define a timeframe/duration for EVERY mechanic. 
- Moment-to-moment (1-3s)
- Action-level (10-30s)
- Mission-level (5-15m)
- Session-level (1-2h)
Add a \`duration\` field to each mechanic description (e.g., "Duration: 5-10s").

AVOID:
- Skipping stages in the loop pattern.
- Overlapping different types without sequential connections.
- Generic mechanics without specific durations.

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
  const mechanicsList =
    state.mechanics.length > 0
      ? state.mechanics
          .map(
            m =>
              `- ${m.id}: ${m.name} (${m.type}) - Inputs: [${m.inputs.join(', ')}], Outputs: [${m.outputs.join(', ')}]`
          )
          .join('\n')
      : 'No mechanics defined yet'

  const connectionsList =
    state.connections.length > 0
      ? state.connections.map(c => `- ${c.source} --${c.type}--> ${c.target}`).join('\n')
      : 'No connections defined yet'

  return MECHANICS_DESIGNER_SYSTEM_PROMPT.replace('{{GENRE}}', state.gameGenre || 'Not specified')
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
  console.log('[MechanicsDesigner] Starting...')

  const model = new ChatOpenAI({
    modelName: state.modelConfig?.model || 'gpt-4o',
    temperature: state.modelConfig?.temperature ?? 0.5,
  })

  // Get the task from the last human message or use default
  const lastHumanMsg = [...state.messages].reverse().find(m => m._getType() === 'human')
  const task = lastHumanMsg
    ? typeof lastHumanMsg.content === 'string'
      ? lastHumanMsg.content
      : 'Design game mechanics'
    : 'Design core game mechanics based on the game context'

  const systemPrompt = buildContext(state).replace('{{TASK}}', task)

  const messages = [new SystemMessage(systemPrompt), ...state.messages.slice(-5)]

  console.log('[MechanicsDesigner] Task:', task.slice(0, 100))
  console.log('[MechanicsDesigner] Calling LLM...')

  const response = await model.invoke(messages)

  console.log('[MechanicsDesigner] LLM response received')

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  console.log('[MechanicsDesigner] Response length:', content.length)

  const parsed = parseResponse(content)

  console.log(
    `[MechanicsDesigner] Created ${parsed.mechanics.length} mechanics, ${parsed.connections.length} connections`
  )

  // Convert mechanics to canvas node actions
  const actions: LoopAgentAction[] = []
  let yOffset = 100

  for (const m of parsed.mechanics) {
    // Map mechanic types to node types
    const nodeTypeMap: Record<string, string> = {
      core: 'challenge',
      secondary: 'action',
      meta: 'feedback',
      progression: 'reward',
      reward: 'reward',
    }

    actions.push({
      type: 'ADD_NODE' as const,
      payload: {
        id: m.id,
        label: m.name,
        description: m.description,
        nodeType: nodeTypeMap[m.type] || 'action',
        position: { x: 200 + (Math.random() * 200 - 100), y: yOffset },
        mechanicData: {
          type: m.type,
          inputs: m.inputs,
          outputs: m.outputs,
          balanceFactors: m.balanceFactors,
          examples: m.examples,
        },
      },
      confidence: 0.8,
      reasoning: parsed.analysis,
    })
    yOffset += 120
  }

  // Add connection actions
  for (const c of parsed.connections) {
    actions.push({
      type: 'ADD_EDGE' as const,
      payload: {
        id: c.id,
        source: c.source,
        target: c.target,
        label: c.label || c.type,
      },
      confidence: 0.8,
      reasoning: parsed.analysis,
    })
  }

  // Run auto-evaluation to check concept alignment
  let evaluationNote = ''
  try {
    const { evaluateConceptAlignment } = await import('./concept-evaluator')
    const evalState = {
      ...state,
      mechanics: parsed.mechanics,
    }
    const evaluation = await evaluateConceptAlignment(evalState)

    console.log(`[MechanicsDesigner] Concept alignment: ${evaluation.overallAlignment}/100`)

    // Add evaluation warning if alignment is low
    if (evaluation.overallAlignment < 60) {
      evaluationNote = `\n\n⚠️ **Concept Alignment: ${evaluation.overallAlignment}/100**\n${evaluation.summary}`

      // Add missing element suggestions
      if (evaluation.conceptMatch.missingElements.length > 0) {
        evaluationNote += `\n\nMissing elements: ${evaluation.conceptMatch.missingElements.join(', ')}`
      }
    } else if (evaluation.overallAlignment >= 80) {
      evaluationNote = `\n\n✨ **High concept alignment: ${evaluation.overallAlignment}/100**`
    }
  } catch (error) {
    console.error('[MechanicsDesigner] Evaluation error:', error)
  }

  return {
    mechanics: parsed.mechanics,
    connections: parsed.connections,
    pendingActions: actions,
    nextAgent: 'supervisor' as NextAgent,
    messages: [
      new AIMessage({
        content:
          (parsed.message ||
            `Created ${parsed.mechanics.length} mechanics with ${parsed.connections.length} connections.`) +
          evaluationNote,
        name: 'mechanics_designer',
      }),
    ],
  }
}
