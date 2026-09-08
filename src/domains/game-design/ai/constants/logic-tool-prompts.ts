import type { GameMechanic } from '../../core/schemas'
import { ListSeparator } from './agent-copy'
import {
  ExpansionDirection,
  GameDesignToolCopy,
  LOGIC_EXPANSION_HINTS,
  joinWithCommaSpace,
  formatMechanicTransformerLine,
} from './logic-tool-wire'
import type { GameResource } from './logic-tool-schemas'

export function buildIdentifyCoreLoopPrompt(input: {
  mechanics: GameMechanic[]
  genre: string
  targetAudience: string
}): string {
  return `You are a senior game designer specializing in game loop analysis.

Analyze these game mechanics and identify the CORE LOOP - the central repeating engagement cycle.

## Mechanics
${input.mechanics.map(mechanic => `- ${mechanic.name} (${mechanic.type}): ${mechanic.description}`).join('\n')}

## Context
- Genre: ${input.genre}
- Target Audience: ${input.targetAudience}

## Your Task
1. Identify which mechanics form the primary loop
2. Determine the loop type (compulsion/core/meta/social/monetization)
3. Estimate the cycle duration
4. Explain the psychological hook that keeps players engaged

Focus on the MOST ENGAGING and FREQUENTLY REPEATED loop.

Name the core loop, its type (compulsion/core/meta/social/monetization), the mechanic IDs involved, cycle duration, psychological hook, confidence (0-1), and reasoning.`
}

function formatMechanicBalanceLine(mechanic: GameMechanic): string {
  const transformerInfo =
    mechanic.transformers
      ?.map(transformer =>
        formatMechanicTransformerLine(transformer.type, transformer.inputs, transformer.outputs)
      )
      .join('\n') || GameDesignToolCopy.NoTransformers
  return `- ${mechanic.name} (${mechanic.type}):\n  ${mechanic.description}\n${transformerInfo}`
}

export function buildAnalyzeMechanicBalancePrompt(input: {
  mechanics: GameMechanic[]
  resources: GameResource[]
  targetAudience: string
  sessionDurationMinutes: number
}): string {
  return `You are a game economy and balance expert.

Analyze the balance of these game mechanics and provide a detailed assessment.

## Mechanics
${input.mechanics.map(formatMechanicBalanceLine).join('\n\n')}

## Resources in Economy
${input.resources.map(resource => `- ${resource.name} (${resource.type}): starts at ${resource.initialValue}`).join('\n')}

## Context
- Target Audience: ${input.targetAudience}
- Target Session Duration: ${input.sessionDurationMinutes} minutes

## Your Task
1. Calculate an overall balance score (0-10)
2. Identify the economy health state
3. Find specific balance issues (reward imbalance, effort mismatch, dead ends, grind)
4. Provide actionable recommendations
5. Estimate key metrics like time to first reward

Be specific about which mechanics cause problems and how to fix them.
Consider the target audience - casual players have less tolerance for grind.

Return overallScore (0-10), economyHealth, issues (severity, type, description, affectedMechanics, suggestedFix), recommendations, and simulationResults (timeToFirstReward, resourcesAtSessionEnd, playerSatisfactionEstimate).`
}

function formatExpansionHint(direction: string): string {
  if (direction === ExpansionDirection.Depth) return LOGIC_EXPANSION_HINTS[ExpansionDirection.Depth]
  if (direction === ExpansionDirection.Breadth) {
    return LOGIC_EXPANSION_HINTS[ExpansionDirection.Breadth]
  }
  if (direction === ExpansionDirection.Complexity) {
    return LOGIC_EXPANSION_HINTS[ExpansionDirection.Complexity]
  }
  return ''
}

export function buildSuggestProgressionPrompt(input: {
  loopName: string
  loopType: string
  resourceNames: string
  nodeCount: number
  edgeCount: number
  existingMechanics: GameMechanic[]
  expansionDirection: string
  theme: string
  genre: string
  targetAudience: string
}): string {
  return `You are a game design consultant specializing in progression systems.

Analyze this game loop and suggest ways to expand its progression.

## Current Loop
- Name: ${input.loopName}
- Type: ${input.loopType}
- Resources: ${input.resourceNames}
- Nodes: ${input.nodeCount}
- Edges: ${input.edgeCount}

## Existing Mechanics
${input.existingMechanics.map(mechanic => `- ${mechanic.name}: ${mechanic.description}`).join('\n') || GameDesignToolCopy.None}

## Expansion Direction
- Direction: ${input.expansionDirection}
  ${formatExpansionHint(input.expansionDirection)}

## Context
- Theme: ${input.theme}
- Genre: ${input.genre}
- Target Audience: ${input.targetAudience}

## Your Task
1. Suggest 3-5 specific improvements
2. For each suggestion, explain the implementation approach
3. Rate the impact on engagement, complexity, and monetization potential
4. Prioritize suggestions based on effort vs. impact
5. Provide overall strategic direction

Be creative but practical. Suggestions should enhance player engagement without overwhelming them.

Return suggestions (id, type, title, description, impact on engagement/complexity/monetization, implementation, priority) and overallDirection.`
}

export { joinWithCommaSpace, ListSeparator }
