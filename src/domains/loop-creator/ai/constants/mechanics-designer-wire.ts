import { v4 as uuidv4 } from 'uuid'
import {
  readNumber,
  readRowString,
  readString,
  recordArrayFromJson,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import { NEXT_AGENT_SUPERVISOR } from '@/domains/loop-creator/constants/graph-state-defaults'
import { LangChainMessageWire } from '@/domains/loop-creator/constants/loop-orchestrator'
import type { LoopCreatorState, MechanicEdge, MechanicNode } from '../../core/graph/state'
import { parseMechanicEdgeType } from '../../core/graph/state'

export const MECHANICS_DESIGNER_SYSTEM_PROMPT = `You are a Game Mechanics Designer - an expert in creating compelling gameplay mechanics.

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

export enum MechanicsDesignerPromptPlaceholder {
  Task = '{{TASK}}',
  Genre = '{{GENRE}}',
  Platform = '{{PLATFORM}}',
  Audience = '{{AUDIENCE}}',
  Description = '{{DESCRIPTION}}',
  Mechanics = '{{MECHANICS}}',
  Connections = '{{CONNECTIONS}}',
}

export enum MechanicsDesignerContextDefault {
  NotSpecified = 'Not specified',
  NoMechanicsYet = 'No mechanics defined yet',
  NoConnectionsYet = 'No connections defined yet',
}

export enum MechanicsDesignerListSeparator {
  CommaSpace = ', ',
}

export enum MechanicNodeKind {
  Core = 'core',
  Secondary = 'secondary',
  Meta = 'meta',
  Progression = 'progression',
  Reward = 'reward',
}

export enum MechanicsDesignerJsonField {
  Id = 'id',
  Name = 'name',
  Description = 'description',
  Source = 'source',
  Target = 'target',
  Label = 'label',
  Analysis = 'analysis',
  Message = 'message',
}

export enum MechanicsDesignerDefaultLabel {
  UnnamedMechanic = 'Unnamed Mechanic',
}

export enum MechanicsDesignerDefaultTask {
  DesignGameMechanics = 'Design game mechanics',
  DesignCoreMechanics = 'Design core game mechanics based on the game context',
}

export enum MechanicsDesignerLog {
  Starting = '[MechanicsDesigner] Starting...',
  Task = '[MechanicsDesigner] Task:',
  CallingLlm = '[MechanicsDesigner] Calling LLM...',
  LlmResponseReceived = '[MechanicsDesigner] LLM response received',
  ResponseLength = '[MechanicsDesigner] Response length:',
  CreatedSummary = '[MechanicsDesigner] Created ',
  MechanicsWord = ' mechanics, ',
  ConnectionsWord = ' connections',
  EvaluationError = '[MechanicsDesigner] Evaluation error:',
}

export { NEXT_AGENT_SUPERVISOR as MECHANICS_DESIGNER_NEXT_AGENT }
export { LoopAgentNode as MechanicsDesignerAgentName }

const MECHANIC_NODE_KINDS: MechanicNode['type'][] = [
  MechanicNodeKind.Core,
  MechanicNodeKind.Secondary,
  MechanicNodeKind.Meta,
  MechanicNodeKind.Progression,
  MechanicNodeKind.Reward,
]
const MECHANIC_NODE_KIND_SET = new Set<string>(MECHANIC_NODE_KINDS)

export interface MechanicsDesignerResponse {
  analysis: string
  mechanics: MechanicNode[]
  connections: MechanicEdge[]
  message: string
}

function readMechanicType(value: unknown): MechanicNode['type'] {
  const raw = readString(value)
  if (raw && MECHANIC_NODE_KIND_SET.has(raw)) {
    for (const entry of MECHANIC_NODE_KINDS) {
      if (entry === raw) return entry
    }
  }
  return MechanicNodeKind.Core
}

function parseMechanicNode(raw: unknown): MechanicNode {
  const mechanic = recordFromJson(raw)
  const balanceFactors = recordFromJson(mechanic.balanceFactors)
  return {
    id: readRowString(mechanic, MechanicsDesignerJsonField.Id) ?? uuidv4(),
    name:
      readRowString(mechanic, MechanicsDesignerJsonField.Name) ??
      MechanicsDesignerDefaultLabel.UnnamedMechanic,
    type: readMechanicType(mechanic.type),
    description: readRowString(mechanic, MechanicsDesignerJsonField.Description) ?? '',
    inputs: stringArrayFromJson(mechanic.inputs),
    outputs: stringArrayFromJson(mechanic.outputs),
    balanceFactors: {
      effort: readNumber(balanceFactors.effort) ?? 5,
      reward: readNumber(balanceFactors.reward) ?? 5,
      frequency: readNumber(balanceFactors.frequency) ?? 5,
    },
    examples: stringArrayFromJson(mechanic.examples),
  }
}

function parseMechanicEdge(raw: unknown): MechanicEdge {
  const connection = recordFromJson(raw)
  return {
    id: readRowString(connection, MechanicsDesignerJsonField.Id) ?? uuidv4(),
    source: readRowString(connection, MechanicsDesignerJsonField.Source) ?? '',
    target: readRowString(connection, MechanicsDesignerJsonField.Target) ?? '',
    type: parseMechanicEdgeType(connection.type),
    label: readRowString(connection, MechanicsDesignerJsonField.Label),
  }
}

export function buildMechanicsDesignerContext(state: LoopCreatorState): string {
  const mechanicsList =
    state.mechanics.length > 0
      ? state.mechanics
          .map(
            m =>
              `- ${m.id}: ${m.name} (${m.type}) - Inputs: [${m.inputs.join(MechanicsDesignerListSeparator.CommaSpace)}], Outputs: [${m.outputs.join(MechanicsDesignerListSeparator.CommaSpace)}]`,
          )
          .join('\n')
      : MechanicsDesignerContextDefault.NoMechanicsYet

  const connectionsList =
    state.connections.length > 0
      ? state.connections.map(c => `- ${c.source} --${c.type}--> ${c.target}`).join('\n')
      : MechanicsDesignerContextDefault.NoConnectionsYet

  return MECHANICS_DESIGNER_SYSTEM_PROMPT.replace(
    MechanicsDesignerPromptPlaceholder.Genre,
    state.gameGenre || MechanicsDesignerContextDefault.NotSpecified,
  )
    .replace(
      MechanicsDesignerPromptPlaceholder.Platform,
      state.gamePlatform || MechanicsDesignerContextDefault.NotSpecified,
    )
    .replace(
      MechanicsDesignerPromptPlaceholder.Audience,
      state.targetAudience || MechanicsDesignerContextDefault.NotSpecified,
    )
    .replace(
      MechanicsDesignerPromptPlaceholder.Description,
      state.gameDescription || MechanicsDesignerContextDefault.NotSpecified,
    )
    .replace(MechanicsDesignerPromptPlaceholder.Mechanics, mechanicsList)
    .replace(MechanicsDesignerPromptPlaceholder.Connections, connectionsList)
}

export function parseMechanicsDesignerResponse(content: string): MechanicsDesignerResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = recordFromJson(JSON.parse(jsonMatch[0]))
      return {
        analysis: readRowString(parsed, MechanicsDesignerJsonField.Analysis) ?? '',
        mechanics: recordArrayFromJson(parsed.mechanics).map(parseMechanicNode),
        connections: recordArrayFromJson(parsed.connections).map(parseMechanicEdge),
        message: readRowString(parsed, MechanicsDesignerJsonField.Message) ?? '',
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

export function resolveMechanicsDesignerTask(state: LoopCreatorState): string {
  const lastHumanMsg = [...state.messages]
    .reverse()
    .find(m => m._getType() === LangChainMessageWire.Human)
  if (!lastHumanMsg) return MechanicsDesignerDefaultTask.DesignCoreMechanics
  if (typeof lastHumanMsg.content === 'string') return lastHumanMsg.content
  return MechanicsDesignerDefaultTask.DesignGameMechanics
}
