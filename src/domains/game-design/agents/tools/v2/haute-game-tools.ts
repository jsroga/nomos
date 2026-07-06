/**
 * Haute Game Design Tools
 *
 * A unified framework combining:
 * - Klei's elegant emergent systems
 * - CDPR's narrative depth and moral complexity
 * - Kojima's connection and meaningful mundane
 *
 * "Systems that tell stories, stories that connect players,
 *  players that discover meaning."
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import {
  AtomicLoomOutputSchema,
  MemoryKeeperOutputSchema,
  GreyPaletteOutputSchema,
  StrandWeaverOutputSchema,
  SilentTeacherOutputSchema,
  MundanePoetOutputSchema,
} from '../../core/schemas'
import { getErrorMessage } from '@/shared/errors/error-utils'

function getModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.7, // Higher for creative design
  })
}

function extractJson(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch[0])
}

// ==========================================
// 1. ATOMIC LOOM (Klei: Systems First)
// ==========================================

const AtomicLoomInputSchema = z.object({
  gameDescription: z.string().describe('Brief description of the game concept'),
  genre: z.string().describe('Game genre'),
  existingMechanics: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  complexityTarget: z.enum(['minimal', 'moderate', 'complex']).default('moderate'),
})

export const createAtomicLoomTool = () =>
  createTool({
    id: 'design_atomic_systems',
    description: `Breaks a game concept into atomic verbs and nouns, then maps their interactions.
Creates elegant rule systems where simple elements combine into emergent complexity.
Inspired by Klei's design philosophy: few rules, many outcomes.`,
    schema: AtomicLoomInputSchema,
    execute: async (args) => {
      try {
        const { gameDescription, genre, existingMechanics, complexityTarget } = args

        const prompt = `You are a systems designer inspired by Klei Entertainment (Don't Starve, Oxygen Not Included).

Your philosophy: Create atomic rules that interact. Players discover combinations you never planned.

## Game Concept
${gameDescription}

## Genre
${genre}

## Existing Mechanics
${existingMechanics?.map(m => `- ${m.name}: ${m.description || 'No description'}`).join('\n') || 'None yet'}

## Complexity Target
${complexityTarget}

## Your Task
Design an atomic system where:
1. **Verbs** are actions (burn, freeze, feed, break, combine)
2. **Nouns** are entities with properties and states
3. **Rules** define what happens when verb meets noun
4. **Emergent combos** are unplanned but valid chains

Think like Klei: "If fire exists, it should burn ALL flammable things."

Create ${complexityTarget === 'minimal' ? '3-5' : complexityTarget === 'moderate' ? '5-8' : '8-12'} verbs and nouns.

Respond with JSON:
{
  "verbs": [{ "id": "string", "name": "string", "targets": ["noun types"], "effects": ["state changes"], "playerInitiated": true }],
  "nouns": [{ "id": "string", "name": "string", "properties": ["traits"], "states": ["possible states"], "category": "resource|entity|environment|abstract" }],
  "rules": [{ "id": "string", "verb": "string", "noun": "string", "result": "string", "emergent": ["chains"], "chainable": true/false }],
  "emergentCombos": [{ "chain": ["verb+noun", "verb+noun"], "outcome": "string", "discoveryDifficulty": "obvious|hidden|secret" }],
  "systemEleganceScore": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = AtomicLoomOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// 2. MEMORY KEEPER (CDPR: World Remembers)
// ==========================================

const MemoryKeeperInputSchema = z.object({
  gameContext: z.string().describe('Current game/story context'),
  playerActions: z
    .array(
      z.object({
        action: z.string(),
        target: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .optional(),
  npcs: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        faction: z.string().optional(),
      })
    )
    .optional(),
  timeScope: z.enum(['session', 'campaign', 'persistent']).default('campaign'),
})

export const createMemoryKeeperTool = () =>
  createTool({
    id: 'design_world_memory',
    description: `Designs systems where the world remembers player actions.
NPCs witness events, rumors spread, and past actions seed future quests.
Inspired by CDPR's narrative depth: every quest connects, nothing is throwaway.`,
    schema: MemoryKeeperInputSchema,
    execute: async (args) => {
      try {
        const { gameContext, playerActions, npcs, timeScope } = args

        const prompt = `You are a narrative systems designer inspired by CD Projekt Red (Witcher 3, Cyberpunk 2077).

Your philosophy: The world remembers. The butcher you helped in Act 1 appears in Act 3.

## Game Context
${gameContext}

## Recent Player Actions
${playerActions?.map(a => `- ${a.action}${a.target ? ` (target: ${a.target})` : ''}${a.location ? ` at ${a.location}` : ''}`).join('\n') || 'New game'}

## NPCs in World
${npcs?.map(n => `- ${n.name} (${n.role})${n.faction ? ` - ${n.faction}` : ''}`).join('\n') || 'To be designed'}

## Persistence Scope
${timeScope}

## Your Task
Design a memory system where:
1. **Events** are witnessed by NPCs who remember
2. **Rumors** spread and distort over time
3. **Quest triggers** emerge from accumulated events

Think like CDPR: "Twenty hours later, your choice matters."

Respond with JSON:
{
  "events": [{ "id": "string", "type": "action|dialogue|discovery|combat|choice", "description": "string", "witnesses": ["npc ids"], "decayDays": number, "propagationRadius": "local|regional|global" }],
  "rumors": [{ "id": "string", "sourceEvent": "event id", "currentForm": "how told now", "distortionLevel": 0-1, "spreadRate": "slow|medium|fast|viral", "factionReach": ["factions"] }],
  "questTriggers": [{ "condition": "what triggers", "questSeed": "brief concept", "delay": "immediate|short|long|very_long" }],
  "worldMemoryDepth": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = MemoryKeeperOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// 3. GREY PALETTE (CDPR: Moral Complexity)
// ==========================================

const GreyPaletteInputSchema = z.object({
  situation: z.string().describe('The dilemma or conflict situation'),
  factions: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
        playerRelation: z.enum(['allied', 'neutral', 'hostile']).optional(),
      })
    )
    .optional(),
  stakes: z.enum(['personal', 'local', 'regional', 'world']).default('local'),
  genre: z.string().optional(),
})

export const createGreyPaletteTool = () =>
  createTool({
    id: 'design_moral_choices',
    description: `Creates morally complex choices where no option is clearly "right."
Every choice has real cost, factions react, and consequences ripple through time.
Inspired by CDPR: "Evil is evil, lesser, greater, middling... makes no difference."`,
    schema: GreyPaletteInputSchema,
    execute: async (args) => {
      try {
        const { situation, factions, stakes, genre } = args

        const prompt = `You are a narrative designer inspired by CD Projekt Red's moral complexity.

Your philosophy: No good choices. No bad choices. Only human choices.

## Situation
${situation}

## Factions Involved
${factions?.map(f => `- ${f.name}: Values ${f.values.join(', ')}${f.playerRelation ? ` (${f.playerRelation})` : ''}`).join('\n') || 'Design factions as needed'}

## Stakes Level
${stakes}

## Genre
${genre || 'Fantasy RPG'}

## Your Task
Design impossible choices where:
1. **Both options have real cost** - no easy outs
2. **Factions react** - helping A hurts B
3. **Consequences chain** - immediate, short-term, long-term, permanent
4. **Truth is complicated** - player may never know if they chose "right"

Think like CDPR: "The Bloody Baron is a monster AND a victim."

Respond with JSON:
{
  "choices": [{
    "id": "string",
    "situation": "the dilemma",
    "options": [{
      "id": "string",
      "action": "what player does",
      "immediateGain": "optional benefit",
      "hiddenCost": "optional hidden price",
      "factionImpact": { "faction_name": -10 to 10 },
      "moralWeight": "light|moderate|heavy|defining"
    }],
    "noGoodChoice": true/false,
    "delayedConsequence": true/false
  }],
  "consequences": [{
    "triggerId": "choice id",
    "immediate": ["happens now"],
    "shortTerm": ["same session"],
    "longTerm": ["hours later"],
    "permanent": ["forever changed"]
  }],
  "factionTensions": [{
    "factionA": "name",
    "factionB": "name",
    "tension": "allied|neutral|suspicious|hostile|war",
    "playerCanInfluence": true/false
  }],
  "moralComplexityScore": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = GreyPaletteOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// 4. STRAND WEAVER (Kojima: Connection)
// ==========================================

const StrandWeaverInputSchema = z.object({
  gameType: z.string().describe('Type of game (survival, adventure, etc.)'),
  multiplayerModel: z.enum(['none', 'async', 'coop', 'competitive']).default('async'),
  persistenceLevel: z.enum(['session', 'server', 'global']).default('server'),
  connectionTheme: z.string().optional().describe('Thematic reason for connection'),
})

export const createStrandWeaverTool = () =>
  createTool({
    id: 'design_strand_connections',
    description: `Designs asynchronous multiplayer systems where players leave traces for others.
Not lobbies or chat - legacies, echoes, inherited consequences.
Inspired by Kojima: "Games should connect strangers in ways social media never could."`,
    schema: StrandWeaverInputSchema,
    execute: async (args) => {
      try {
        const { gameType, multiplayerModel, persistenceLevel, connectionTheme } = args

        const prompt = `You are a connection systems designer inspired by Hideo Kojima (Death Stranding, MGS5).

Your philosophy: Your isolation is an illusion. We're all connected through traces and legacies.

## Game Type
${gameType}

## Multiplayer Model
${multiplayerModel}

## Persistence Level
${persistenceLevel}

## Connection Theme
${connectionTheme || 'Unspecified - design thematically appropriate connections'}

## Your Task
Design strand systems where:
1. **Traces** - What players leave behind (not just likes)
2. **Legacies** - How one player's ending becomes another's beginning
3. **Shared challenges** - Problems that require many hands
4. **Indirect gifts** - Helping without knowing who

Think like Kojima: "Another player's abandoned farm becomes ruins you discover."

Respond with JSON:
{
  "traceTypes": [{
    "id": "string",
    "name": "what players leave",
    "persistence": "session|permanent|decaying",
    "visibility": "always|proximity|special_condition",
    "interactable": true/false,
    "examples": ["specific examples"]
  }],
  "legacyElements": [{
    "id": "string",
    "sourceType": "death|abandonment|achievement|gift",
    "element": "what persists",
    "transformRules": "how it changes",
    "inheritanceChance": 0-1
  }],
  "sharedChallenges": [{
    "name": "string",
    "description": "string",
    "contributionType": "additive|competitive|collaborative",
    "reward": "string"
  }],
  "connectionMeaningScore": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = StrandWeaverOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// 5. SILENT TEACHER (Klei: Discovery)
// ==========================================

const SilentTeacherInputSchema = z.object({
  mechanicsToTeach: z.array(
    z.object({
      name: z.string(),
      complexity: z.enum(['simple', 'moderate', 'complex']),
      dependencies: z.array(z.string()).optional(),
    })
  ),
  playerSkillCurve: z.enum(['gentle', 'moderate', 'steep']).default('moderate'),
  genre: z.string().optional(),
})

export const createSilentTeacherTool = () =>
  createTool({
    id: 'design_implicit_tutorial',
    description: `Designs learning through play, not instruction.
No tutorials, no markers, no "press X to not die." Trust players to discover.
Inspired by Klei: Death should teach, not punish.`,
    schema: SilentTeacherInputSchema,
    execute: async (args) => {
      try {
        const { mechanicsToTeach, playerSkillCurve, genre } = args

        const prompt = `You are a learning designer inspired by Klei Entertainment's respect for players.

Your philosophy: No tutorials. No markers. Trust them to figure it out. Death teaches.

## Mechanics to Teach
${mechanicsToTeach.map(m => `- ${m.name} (${m.complexity})${m.dependencies?.length ? ` - requires: ${m.dependencies.join(', ')}` : ''}`).join('\n')}

## Skill Curve
${playerSkillCurve}

## Genre
${genre || 'Survival/Discovery'}

## Your Task
Design implicit learning where:
1. **Scenarios** teach through experience, not words
2. **Failure is cheap** early, expensive later
3. **Breadcrumbs** hint without telling
4. **Safe zones** let players experiment

Think like Klei: "The first enemy IS the lesson."

CRITICAL: "explicitInstruction" must ALWAYS be false. Never tell, always show.

Respond with JSON:
{
  "scenarios": [{
    "id": "string",
    "mechanicToTeach": "mechanic name",
    "setupDescription": "how arranged",
    "failureMode": "what happens on fail",
    "failureSeverity": "trivial|setback|significant",
    "successIndicator": "how player knows success",
    "explicitInstruction": false
  }],
  "breadcrumbs": [{
    "hint": "subtle environmental hint",
    "mechanic": "what it hints at",
    "obviousness": "subtle|moderate|clear"
  }],
  "safeFailureZones": [{
    "location": "where",
    "purpose": "what to practice",
    "resetCost": "free|minor|moderate"
  }],
  "discoveryRespectScore": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = SilentTeacherOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// 6. MUNDANE POET (Kojima: Meaningful Routine)
// ==========================================

const MundanePoetInputSchema = z.object({
  routineMechanics: z.array(
    z.object({
      name: z.string(),
      currentFeeling: z.enum(['boring', 'neutral', 'satisfying']),
      frequency: z.enum(['constant', 'frequent', 'occasional', 'rare']),
    })
  ),
  gameTheme: z.string().describe('Core emotional theme of the game'),
  pacing: z.enum(['meditative', 'balanced', 'intense']).default('balanced'),
})

export const createMundanePoetTool = () =>
  createTool({
    id: 'design_meaningful_mundane',
    description: `Transforms routine mechanics into meaningful rituals.
Walking, cooking, waiting - these can be profound when designed with intention.
Inspired by Kojima: "Death Stranding taught us walking can be profound."`,
    schema: MundanePoetInputSchema,
    execute: async (args) => {
      try {
        const { routineMechanics, gameTheme, pacing } = args

        const prompt = `You are a ritual designer inspired by Hideo Kojima's attention to the mundane.

Your philosophy: If walking isn't meaningful, why is it in the game?

## Routine Mechanics to Elevate
${routineMechanics.map(m => `- ${m.name}: Currently ${m.currentFeeling}, happens ${m.frequency}`).join('\n')}

## Game Theme
${gameTheme}

## Desired Pacing
${pacing}

## Your Task
Transform "boring" into ritual where:
1. **Steps matter** - deliberate process, not just button press
2. **Friction has purpose** - slowness that means something
3. **Quiet moments** - silence between storms
4. **Skip penalties** - rushing has cost

Think like Kojima: "The wait, the breath, the walk - they matter."

Respond with JSON:
{
  "rituals": [{
    "id": "string",
    "baseMechanic": "the boring action",
    "ritualName": "what it becomes",
    "steps": ["deliberate process"],
    "emotionalPayoff": "what player feels",
    "frequency": "constant|frequent|occasional|rare",
    "skipPenalty": "optional cost of rushing"
  }],
  "frictionPoints": [{
    "action": "what",
    "friction": "intentional slowness",
    "purpose": "why it matters"
  }],
  "quietMoments": [{
    "trigger": "when it happens",
    "duration": "how long",
    "atmosphere": "what it feels like"
  }],
  "mundaneBeautyScore": 0-10
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])
        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        const parsed = extractJson(content)
        const validated = MundanePoetOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// EXPORT ALL HAUTE GAME TOOLS
// ==========================================

export const createAllHauteGameTools = () => [
  createAtomicLoomTool(),
  createMemoryKeeperTool(),
  createGreyPaletteTool(),
  createStrandWeaverTool(),
  createSilentTeacherTool(),
  createMundanePoetTool(),
]
