import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import {
  GameMechanicSchema,
  IdentifyCoreLoopInputSchema,
  IdentifyCoreLoopOutputSchema,
  AnalyzeBalanceOutputSchema,
  SuggestProgressionOutputSchema,
  GameLoopSchema,
  GameResourceSchema,
  MechanicTransformerSchema,
  type GameMechanic,
} from '../../../core/schemas'

type GameResource = z.infer<typeof GameResourceSchema>
import { getErrorMessage } from '@/shared/errors/error-utils'

// Create a shared model instance
function getModel() {
  return new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.3,
  })
}

// ==========================================
// IDENTIFY CORE LOOP TOOL
// ==========================================

export const createIdentifyCoreLoopTool = () =>
  createTool({
    id: 'identify_core_loop',
    description: `Analyzes a set of game mechanics and identifies the core gameplay loop.
This tool uses AI to determine which mechanics form the central engagement cycle,
what psychological hooks are at play, and how long each cycle typically takes.`,
    inputSchema: IdentifyCoreLoopInputSchema,
    execute: async (args) => {
      try {
        const mechanics = args.mechanics || []
        const genre = args.genre || 'unknown game genre'
        const targetAudience = args.targetAudience || 'casual'

        if (mechanics.length === 0) {
          return {
            success: false,
            error: 'You must provide at least one mechanic to identify a core loop. Please generate some mechanics first.',
          }
        }

        const prompt = `You are a senior game designer specializing in game loop analysis.

Analyze these game mechanics and identify the CORE LOOP - the central repeating engagement cycle.

## Mechanics
${mechanics.map((m: GameMechanic) => `- ${m.name} (${m.type}): ${m.description}`).join('\n')}

## Context
- Genre: ${genre}
- Target Audience: ${targetAudience}

## Your Task
1. Identify which mechanics form the primary loop
2. Determine the loop type (compulsion/core/meta/social/monetization)
3. Estimate the cycle duration
4. Explain the psychological hook that keeps players engaged

Focus on the MOST ENGAGING and FREQUENTLY REPEATED loop.

Respond with JSON matching this schema:
{
  "coreLoop": {
    "name": "string - name of the loop",
    "type": "compulsion|core|meta|social|monetization",
    "mechanics": ["array of mechanic IDs involved"],
    "cycleDuration": { "min": number, "max": number, "unit": "seconds|minutes|hours" },
    "psychologicalHook": "string explaining the engagement driver"
  },
  "confidence": 0-1 number,
  "reasoning": "string explaining your analysis"
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])

        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return { success: false, error: 'Failed to parse AI response' }
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validated = IdentifyCoreLoopOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// ANALYZE MECHANIC BALANCE TOOL
// ==========================================

const AnalyzeMechanicBalanceInputSchema = z.object({
  loopId: z.string().uuid(),
  mechanics: z.array(GameMechanicSchema),
  resources: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['currency', 'material', 'stat', 'abstract']),
      initialValue: z.number(),
    })
  ),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']),
  sessionDurationMinutes: z.number().default(30),
})

export const createAnalyzeMechanicBalanceTool = () =>
  createTool({
    id: 'analyze_mechanic_balance',
    description: `Analyzes the balance of game mechanics within a loop.
Checks for reward imbalances, effort mismatches, dead ends, and grind detection.
Returns a comprehensive balance report with actionable recommendations.`,
    inputSchema: AnalyzeMechanicBalanceInputSchema,
    execute: async (args) => {
      try {
        const mechanics = args.mechanics || []
        const resources = args.resources || []
        const targetAudience = args.targetAudience || 'casual'
        const sessionDurationMinutes = args.sessionDurationMinutes || 30
        const loopId = args.loopId || 'unknown'

        if (mechanics.length === 0) {
          return { success: false, error: 'No mechanics provided to analyze.' }
        }

        const prompt = `You are a game economy and balance expert.

Analyze the balance of these game mechanics and provide a detailed assessment.

## Mechanics
${mechanics
            .map((m: GameMechanic) => {
              const transformerInfo =
                m.transformers
                  ?.map(
                    (t: z.infer<typeof MechanicTransformerSchema>) =>
                      `  - ${t.type}: inputs=${JSON.stringify(t.inputs)}, outputs=${JSON.stringify(t.outputs)}`
                  )
                  .join('\n') || '  (no transformers)'
              return `- ${m.name} (${m.type}):\n  ${m.description}\n${transformerInfo}`
            })
            .join('\n\n')}

## Resources in Economy
${resources.map((r: GameResource) => `- ${r.name} (${r.type}): starts at ${r.initialValue}`).join('\n')}

## Context
- Target Audience: ${targetAudience}
- Target Session Duration: ${sessionDurationMinutes} minutes

## Your Task
1. Calculate an overall balance score (0-10)
2. Identify the economy health state
3. Find specific balance issues (reward imbalance, effort mismatch, dead ends, grind)
4. Provide actionable recommendations
5. Estimate key metrics like time to first reward

Be specific about which mechanics cause problems and how to fix them.
Consider the target audience - casual players have less tolerance for grind.

Respond with JSON matching this schema:
{
  "overallScore": 0-10 number,
  "economyHealth": "healthy|inflationary|deflationary|broken",
  "issues": [
    {
      "severity": "critical|warning|suggestion",
      "type": "reward_imbalance|effort_mismatch|loop_break|dead_end|grind_detected|resource_flood|resource_drought",
      "description": "string",
      "affectedMechanics": ["mechanic names"],
      "suggestedFix": "optional string"
    }
  ],
  "recommendations": ["array of strings"],
  "simulationResults": {
    "timeToFirstReward": number in seconds,
    "resourcesAtSessionEnd": { "resourceName": value },
    "playerSatisfactionEstimate": 0-10 number
  }
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])

        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return { success: false, error: 'Failed to parse AI response' }
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validated = AnalyzeBalanceOutputSchema.parse(parsed)

        return { success: true, loopId, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// SUGGEST PROGRESSION TOOL
// ==========================================

const SuggestProgressionToolInputSchema = z.object({
  currentLoop: GameLoopSchema,
  existingMechanics: z.array(GameMechanicSchema).optional(),
  expansionDirection: z.enum(['depth', 'breadth', 'complexity']),
  theme: z.string().optional(),
  genre: z.string().optional(),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']).optional(),
})

export const createSuggestProgressionTool = () =>
  createTool({
    id: 'suggest_progression',
    description: `Suggests ways to expand and improve a game loop's progression system.
Can suggest new mechanics, balance tweaks, or progression gates based on the
desired expansion direction (depth, breadth, or complexity).`,
    inputSchema: SuggestProgressionToolInputSchema,
    execute: async (args) => {
      try {
        const currentLoop = args.currentLoop
        const existingMechanics = args.existingMechanics || []
        const expansionDirection = args.expansionDirection || 'depth'
        const theme = args.theme || 'Not specified'
        const genre = args.genre || 'Not specified'
        const targetAudience = args.targetAudience || 'Not specified'

        if (!currentLoop) {
          return { success: false, error: 'currentLoop is required to suggest progression.' }
        }

        const prompt = `You are a game design consultant specializing in progression systems.

Analyze this game loop and suggest ways to expand its progression.

## Current Loop
- Name: ${currentLoop.name || 'Unknown'}
- Type: ${currentLoop.type || 'Unknown'}
- Resources: ${currentLoop.resources?.map((r: GameResource) => r.name).join(', ') || 'None defined'}
- Nodes: ${currentLoop.nodes?.length || 0}
- Edges: ${currentLoop.edges?.length || 0}

## Existing Mechanics
${existingMechanics.map((m: GameMechanic) => `- ${m.name}: ${m.description}`).join('\n') || 'None'}

## Expansion Direction
- Direction: ${expansionDirection}
  ${expansionDirection === 'depth' ? '(Make existing systems more nuanced and layered)' : ''}
  ${expansionDirection === 'breadth' ? '(Add new parallel systems and variety)' : ''}
  ${expansionDirection === 'complexity' ? '(Increase interconnection and emergent gameplay)' : ''}

## Context
- Theme: ${theme}
- Genre: ${genre}
- Target Audience: ${targetAudience}

## Your Task
1. Suggest 3-5 specific improvements
2. For each suggestion, explain the implementation approach
3. Rate the impact on engagement, complexity, and monetization potential
4. Prioritize suggestions based on effort vs. impact
5. Provide overall strategic direction

Be creative but practical. Suggestions should enhance player engagement without overwhelming them.

Respond with JSON matching this schema:
{
  "suggestions": [
    {
      "id": "uuid string",
      "type": "new_mechanic|new_loop|balance_tweak|progression_gate",
      "title": "string",
      "description": "string",
      "impact": { "engagement": -5 to 5, "complexity": -5 to 5, "monetization": -5 to 5 },
      "implementation": "string describing how to implement",
      "priority": "high|medium|low"
    }
  ],
  "overallDirection": "string with strategic advice"
}`

        const model = getModel()
        const response = await model.invoke([{ role: 'user', content: prompt }])

        const content =
          typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return { success: false, error: 'Failed to parse AI response' }
        }

        const parsed = JSON.parse(jsonMatch[0])
        const validated = SuggestProgressionOutputSchema.parse(parsed)

        return { success: true, ...validated }
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })

// ==========================================
// VALIDATE LOOP STRUCTURE TOOL
// ==========================================

const ValidateLoopStructureInputSchema = z.object({
  loop: GameLoopSchema,
  mechanics: z.array(GameMechanicSchema),
})

const ValidateLoopStructureOutputSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(
    z.object({
      type: z.enum([
        'orphan_node',
        'missing_mechanic',
        'cycle_break',
        'unreachable_state',
        'invalid_edge',
      ]),
      severity: z.enum(['error', 'warning']),
      description: z.string(),
      affectedNodeIds: z.array(z.string()).optional(),
    })
  ),
  metrics: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    cycleDetected: z.boolean(),
    averagePathLength: z.number().optional(),
  }),
})

type ValidateLoopStructureIssue = z.infer<
  typeof ValidateLoopStructureOutputSchema
>['issues'][number]

export const createValidateLoopStructureTool = () =>
  createTool({
    id: 'validate_loop_structure',
    description: `Validates the structural integrity of a game loop.
Checks for orphan nodes, missing mechanics, broken cycles, and unreachable states.
Returns validation results with specific issues and graph metrics.`,
    inputSchema: ValidateLoopStructureInputSchema,
    execute: async (args: z.infer<typeof ValidateLoopStructureInputSchema>) => {
      try {
        const loop = args.loop
        const mechanics = args.mechanics || []
        const issues: ValidateLoopStructureIssue[] = []

        if (!loop || !loop.nodes || !loop.edges) {
          return { success: false, error: 'loop is missing or malformed. loop.nodes and loop.edges are required.' }
        }

        const nodeIds = new Set(loop.nodes.map(n => n.id))
        const mechanicIds = new Set(mechanics.map(m => m.id))

        // Check for orphan nodes (no edges)
        const connectedNodes = new Set<string>()
        for (const edge of loop.edges) {
          connectedNodes.add(edge.sourceNodeId)
          connectedNodes.add(edge.targetNodeId)
        }

        for (const node of loop.nodes) {
          if (!connectedNodes.has(node.id) && loop.nodes.length > 1) {
            issues.push({
              type: 'orphan_node',
              severity: 'warning',
              description: `Node "${node.label || node.id}" has no connections`,
              affectedNodeIds: [node.id],
            })
          }

          // Check if mechanic exists
          if (!mechanicIds.has(node.mechanicId)) {
            issues.push({
              type: 'missing_mechanic',
              severity: 'error',
              description: `Node "${node.label || node.id}" references non-existent mechanic ${node.mechanicId}`,
              affectedNodeIds: [node.id],
            })
          }
        }

        // Check for invalid edges
        for (const edge of loop.edges) {
          if (!nodeIds.has(edge.sourceNodeId)) {
            issues.push({
              type: 'invalid_edge',
              severity: 'error',
              description: `Edge ${edge.id} references non-existent source node ${edge.sourceNodeId}`,
            })
          }
          if (!nodeIds.has(edge.targetNodeId)) {
            issues.push({
              type: 'invalid_edge',
              severity: 'error',
              description: `Edge ${edge.id} references non-existent target node ${edge.targetNodeId}`,
            })
          }
        }

        // Simple cycle detection using DFS
        const adjacencyList = new Map<string, string[]>()
        for (const node of loop.nodes) {
          adjacencyList.set(node.id, [])
        }
        for (const edge of loop.edges) {
          const existing = adjacencyList.get(edge.sourceNodeId) || []
          existing.push(edge.targetNodeId)
          adjacencyList.set(edge.sourceNodeId, existing)
        }

        let cycleDetected = false
        const visited = new Set<string>()
        const recursionStack = new Set<string>()

        function hasCycle(nodeId: string): boolean {
          visited.add(nodeId)
          recursionStack.add(nodeId)

          const neighbors = adjacencyList.get(nodeId) || []
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              if (hasCycle(neighbor)) return true
            } else if (recursionStack.has(neighbor)) {
              return true
            }
          }

          recursionStack.delete(nodeId)
          return false
        }

        for (const node of loop.nodes) {
          if (!visited.has(node.id)) {
            if (hasCycle(node.id)) {
              cycleDetected = true
              break
            }
          }
        }

        // A game loop SHOULD have a cycle
        if (!cycleDetected && loop.nodes.length > 1) {
          issues.push({
            type: 'cycle_break',
            severity: 'warning',
            description: 'No cycle detected in the loop - game loops should typically form a cycle',
          })
        }

        const hasErrors = issues.some(issue => issue.severity === 'error')

        const output = {
          success: true,
          isValid: !hasErrors,
          issues,
          metrics: {
            nodeCount: loop.nodes.length,
            edgeCount: loop.edges.length,
            cycleDetected,
          },
        }

        ValidateLoopStructureOutputSchema.parse({
          isValid: output.isValid,
          issues: output.issues,
          metrics: output.metrics,
        })
        return output
      } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error) }
      }
    },
  })
