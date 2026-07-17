import { ListSeparator } from './agent-copy'
import { GameDesignToolCopy } from './game-design-tool-wire'
import {
  HauteGameComplexityTarget,
  HauteGameCopy,
  HauteGameVerbNounCount,
} from './haute-game-tool-wire'

type AtomicLoomPromptInput = {
  gameDescription: string
  genre: string
  existingMechanics?: { name: string; description?: string }[]
  complexityTarget: string
}

function formatExistingMechanics(
  mechanics: { name: string; description?: string }[] | undefined,
  emptyLabel: string
): string {
  if (!mechanics?.length) return emptyLabel
  return mechanics
    .map(mechanic => `- ${mechanic.name}: ${mechanic.description ?? GameDesignToolCopy.NoDescription}`)
    .join('\n')
}

function resolveVerbNounCount(complexityTarget: string): string {
  if (complexityTarget === HauteGameComplexityTarget.Minimal) return HauteGameVerbNounCount.Minimal
  if (complexityTarget === HauteGameComplexityTarget.Moderate) return HauteGameVerbNounCount.Moderate
  return HauteGameVerbNounCount.Complex
}

export function buildAtomicLoomPrompt(input: AtomicLoomPromptInput): string {
  return `You are a systems designer inspired by Klei Entertainment (Don't Starve, Oxygen Not Included).

Your philosophy: Create atomic rules that interact. Players discover combinations you never planned.

## Game Concept
${input.gameDescription}

## Genre
${input.genre}

## Existing Mechanics
${formatExistingMechanics(input.existingMechanics, HauteGameCopy.NoneYet)}

## Complexity Target
${input.complexityTarget}

## Your Task
Design an atomic system where:
1. **Verbs** are actions (burn, freeze, feed, break, combine)
2. **Nouns** are entities with properties and states
3. **Rules** define what happens when verb meets noun
4. **Emergent combos** are unplanned but valid chains

Think like Klei: "If fire exists, it should burn ALL flammable things."

Create ${resolveVerbNounCount(input.complexityTarget)} verbs and nouns.

Respond with JSON:
{
  "verbs": [{ "id": "string", "name": "string", "targets": ["noun types"], "effects": ["state changes"], "playerInitiated": true }],
  "nouns": [{ "id": "string", "name": "string", "properties": ["traits"], "states": ["possible states"], "category": "resource|entity|environment|abstract" }],
  "rules": [{ "id": "string", "verb": "string", "noun": "string", "result": "string", "emergent": ["chains"], "chainable": true/false }],
  "emergentCombos": [{ "chain": ["verb+noun", "verb+noun"], "outcome": "string", "discoveryDifficulty": "obvious|hidden|secret" }],
  "systemEleganceScore": 0-10
}`
}

type MemoryKeeperPromptInput = {
  gameContext: string
  playerActions?: { action: string; target?: string; location?: string }[]
  npcs?: { name: string; role: string; faction?: string }[]
  timeScope: string
}

function formatPlayerActions(
  actions: { action: string; target?: string; location?: string }[] | undefined
): string {
  if (!actions?.length) return HauteGameCopy.NewGame
  return actions
    .map(action => {
      const targetSuffix = action.target ? ` (target: ${action.target})` : ''
      const locationSuffix = action.location ? ` at ${action.location}` : ''
      return `- ${action.action}${targetSuffix}${locationSuffix}`
    })
    .join('\n')
}

function formatNpcs(npcs: { name: string; role: string; faction?: string }[] | undefined): string {
  if (!npcs?.length) return HauteGameCopy.ToBeDesigned
  return npcs
    .map(npc => `- ${npc.name} (${npc.role})${npc.faction ? ` - ${npc.faction}` : ''}`)
    .join('\n')
}

export function buildMemoryKeeperPrompt(input: MemoryKeeperPromptInput): string {
  return `You are a narrative systems designer inspired by CD Projekt Red (Witcher 3, Cyberpunk 2077).

Your philosophy: The world remembers. The butcher you helped in Act 1 appears in Act 3.

## Game Context
${input.gameContext}

## Recent Player Actions
${formatPlayerActions(input.playerActions)}

## NPCs in World
${formatNpcs(input.npcs)}

## Persistence Scope
${input.timeScope}

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
}

type GreyPalettePromptInput = {
  situation: string
  factions?: { name: string; values: string[]; playerRelation?: string }[]
  stakes: string
  genre?: string
}

function formatFactions(
  factions: { name: string; values: string[]; playerRelation?: string }[] | undefined
): string {
  if (!factions?.length) return HauteGameCopy.DesignFactionsAsNeeded
  return factions
    .map(faction => {
      const relationSuffix = faction.playerRelation ? ` (${faction.playerRelation})` : ''
      return `- ${faction.name}: Values ${faction.values.join(ListSeparator.CommaSpace)}${relationSuffix}`
    })
    .join('\n')
}

export function buildGreyPalettePrompt(input: GreyPalettePromptInput): string {
  return `You are a narrative designer inspired by CD Projekt Red's moral complexity.

Your philosophy: No good choices. No bad choices. Only human choices.

## Situation
${input.situation}

## Factions Involved
${formatFactions(input.factions)}

## Stakes Level
${input.stakes}

## Genre
${input.genre ?? HauteGameCopy.DefaultGenre}

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
}

type StrandWeaverPromptInput = {
  gameType: string
  multiplayerModel: string
  persistenceLevel: string
  connectionTheme?: string
}

export function buildStrandWeaverPrompt(input: StrandWeaverPromptInput): string {
  return `You are a connection systems designer inspired by Hideo Kojima (Death Stranding, MGS5).

Your philosophy: Your isolation is an illusion. We're all connected through traces and legacies.

## Game Type
${input.gameType}

## Multiplayer Model
${input.multiplayerModel}

## Persistence Level
${input.persistenceLevel}

## Connection Theme
${input.connectionTheme ?? HauteGameCopy.UnspecifiedConnections}

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
}

type SilentTeacherPromptInput = {
  mechanicsToTeach: { name: string; complexity: string; dependencies?: string[] }[]
  playerSkillCurve: string
  genre?: string
}

function formatMechanicsToTeach(
  mechanics: { name: string; complexity: string; dependencies?: string[] }[]
): string {
  return mechanics
    .map(mechanic => {
      const dependencySuffix = mechanic.dependencies?.length
        ? ` - requires: ${mechanic.dependencies.join(ListSeparator.CommaSpace)}`
        : ''
      return `- ${mechanic.name} (${mechanic.complexity})${dependencySuffix}`
    })
    .join('\n')
}

export function buildSilentTeacherPrompt(input: SilentTeacherPromptInput): string {
  return `You are a learning designer inspired by Klei Entertainment's respect for players.

Your philosophy: No tutorials. No markers. Trust them to figure it out. Death teaches.

## Mechanics to Teach
${formatMechanicsToTeach(input.mechanicsToTeach)}

## Skill Curve
${input.playerSkillCurve}

## Genre
${input.genre ?? HauteGameCopy.DefaultSurvivalGenre}

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
}

type MundanePoetPromptInput = {
  routineMechanics: { name: string; currentFeeling: string; frequency: string }[]
  gameTheme: string
  pacing: string
}

function formatRoutineMechanics(
  mechanics: { name: string; currentFeeling: string; frequency: string }[]
): string {
  return mechanics
    .map(mechanic => `- ${mechanic.name}: Currently ${mechanic.currentFeeling}, happens ${mechanic.frequency}`)
    .join('\n')
}

export function buildMundanePoetPrompt(input: MundanePoetPromptInput): string {
  return `You are a ritual designer inspired by Hideo Kojima's attention to the mundane.

Your philosophy: If walking isn't meaningful, why is it in the game?

## Routine Mechanics to Elevate
${formatRoutineMechanics(input.routineMechanics)}

## Game Theme
${input.gameTheme}

## Desired Pacing
${input.pacing}

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
}
