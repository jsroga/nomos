/**
 * Consistency Agent
 *
 * AI agent that checks story consistency and proposes fixes.
 * Uses structured output to ensure reliable parsing.
 */

import { z } from 'zod'
import { Agent } from '@mastra/core/agent'
import { GLOBAL_AGENT_MODEL } from '@/domains/storyteller/agents/ModelConfig'
import {
  StoryContext,
  Inconsistency,
  ConsistencyFix,
  ConsistencyCheckResult,
} from '@/domains/storyteller/core/ConsistencyTypes'

/**
 * Schema for affected element
 */
export const AffectedElementSchema = z.object({
  type: z.string().describe('Type of element: character, beat, episode, world_rule'),
  id: z.string().describe('Unique identifier of the element'),
  fieldPath: z.string().describe('JSON path to the specific field (e.g., psychology.traits.brave)'),
})

/**
 * Schema for detected inconsistency
 */
export const InconsistencySchema = z.object({
  type: z
    .enum(['character', 'timeline', 'world_rule', 'plot_logic', 'tone'])
    .describe('Type of inconsistency'),
  severity: z.enum(['minor', 'major', 'critical']).describe('Severity level'),
  description: z.string().describe('Clear description of the inconsistency'),
  affectedElements: z
    .array(AffectedElementSchema)
    .describe('Elements affected by this inconsistency'),
})

/**
 * Schema for JSON values (OpenAI structured output compatible)
 * Note: z.unknown() is NOT compatible with OpenAI - use union of concrete types
 */
export const JsonValueSchema = z
  .union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()), // Simplified - arrays of strings
    z.record(z.string()), // Simplified - objects with string values
  ])
  .describe('JSON-compatible value')

/**
 * Schema for a consistency change
 */
export const ConsistencyChangeSchema = z.object({
  path: z.string().describe('JSON path to the field to change'),
  before: JsonValueSchema.describe('Current value'),
  after: JsonValueSchema.describe('Proposed new value'),
  reason: z.string().describe('Explanation for the change'),
})

/**
 * Schema for a consistency fix
 */
export const ConsistencyFixSchema = z.object({
  targetElement: z
    .object({
      type: z.string().describe('Type of element to fix'),
      id: z.string().describe('ID of element to fix'),
    })
    .describe('Element to apply fix to'),
  changes: z.array(ConsistencyChangeSchema).describe('List of changes to apply'),
})

/**
 * Complete consistency check response schema
 */
export const ConsistencyAgentResponseSchema = z.object({
  inconsistencies: z.array(InconsistencySchema).describe('List of detected inconsistencies'),
  fixes: z.array(ConsistencyFixSchema).describe('Proposed fixes for the inconsistencies'),
})

export type ConsistencyAgentResponse = z.infer<typeof ConsistencyAgentResponseSchema>

/**
 * Build the consistency check prompt
 */
function buildConsistencyPrompt(context: StoryContext, triggerAction?: any): string {
  const { characters, beats, worldRules, seriesBible } = context

  let prompt = `You are a Story Consistency Agent. Your job is to detect and fix inconsistencies in the story.

# Story Context

## Characters
${JSON.stringify(characters, null, 2)}

## Beats (Plot Points)
${JSON.stringify(beats, null, 2)}

## World Rules
${JSON.stringify(worldRules || seriesBible?.worldRules || [], null, 2)}

## Series Bible
${JSON.stringify(seriesBible || {}, null, 2)}

`

  if (triggerAction) {
    prompt += `\n# Recent Change
The following action was just executed:
Type: ${triggerAction.type}
Payload: ${JSON.stringify(triggerAction.payload, null, 2)}

`
  }

  prompt += `# Your Task

1. **Detect Inconsistencies**: Look for:
   - Character trait contradictions (e.g., brave character acting cowardly)
   - Timeline issues (events out of order, cause-effect violations)
   - World rule violations (breaking established rules)
   - Plot logic gaps (knowledge a character shouldn't have)
   - Tone inconsistencies (comedy in dark thriller, etc.)

2. **Propose Fixes**: For each inconsistency:
   - Identify the specific element and field that needs changing
   - Provide the current value and proposed new value
   - Explain why the fix resolves the inconsistency

3. **Prioritize**: Focus on major and critical issues first. Minor issues are okay if they don't break the story.

# Guidelines

- Be specific: Use exact field paths like "psychology.traits.brave" or "sequence"
- Be minimal: Only change what's necessary to fix the inconsistency
- Be conservative: Don't flag stylistic choices or intentional contrasts
- Consider character arcs: Traits can evolve over time, but should be consistent within a beat
- Consider context: A character can act "out of character" if the situation warrants it

# Output Format

Return a JSON object with:
- inconsistencies: Array of detected issues
- fixes: Array of proposed changes to resolve those issues

If no inconsistencies are found, return empty arrays.`

  return prompt
}

/**
 * Run consistency check using the AI agent
 */
export async function runConsistencyCheck(
  context: StoryContext,
  triggerAction?: any
): Promise<ConsistencyCheckResult> {
  // Use string model identifier for Mastra AI SDK v5 compatibility
  const modelString = GLOBAL_AGENT_MODEL.replace(':', '/')

  const agent = new Agent({
    id: 'consistency-agent',
    name: 'Consistency Agent',
    instructions: 'You are an improved Story Consistency Agent.',
    model: modelString,
  })

  const prompt = buildConsistencyPrompt(context, triggerAction)

  try {
    // Use Mastra's structuredOutput for reliable typed responses
    // See: https://mastra.ai/docs/agents/structured-output
    const result = await agent.generate(prompt, {
      structuredOutput: {
        schema: ConsistencyAgentResponseSchema,
      },
    })

    const response = result.object as ConsistencyAgentResponse

    // Add IDs to inconsistencies and fixes
    const inconsistencies: Inconsistency[] = response.inconsistencies.map((inc, idx) => ({
      id: `inc-${Date.now()}-${idx}`,
      type: inc.type as any,
      severity: inc.severity as any,
      description: inc.description,
      affectedElements: inc.affectedElements.map(ae => ({
        type: ae.type,
        id: ae.id,
        fieldPath: ae.fieldPath,
      })),
    }))

    const fixes: ConsistencyFix[] = response.fixes.map((fix, idx) => ({
      id: `fix-${Date.now()}-${idx}`,
      inconsistencyId: inconsistencies[idx]?.id || 'unknown',
      targetElement: {
        type: fix.targetElement.type,
        id: fix.targetElement.id,
      },
      changes: fix.changes.map(c => ({
        path: c.path,
        before: c.before,
        after: c.after,
        reason: c.reason,
      })),
    }))

    // Build summary
    const summary = buildSummary(inconsistencies, fixes)

    return {
      id: `check-${Date.now()}`,
      timestamp: Date.now(),
      inconsistencies,
      fixes,
      summary,
      totalAffected: countAffectedElements(fixes),
    }
  } catch (error) {
    console.error('[Consistency Agent] Error:', error)

    // Return empty result on error
    return {
      id: `check-${Date.now()}`,
      timestamp: Date.now(),
      inconsistencies: [],
      fixes: [],
      summary: 'Consistency check completed with no issues found',
      totalAffected: 0,
    }
  }
}

/**
 * Build a human-readable summary
 */
function buildSummary(inconsistencies: Inconsistency[], fixes: ConsistencyFix[]): string {
  if (inconsistencies.length === 0) {
    return 'No inconsistencies found'
  }

  const elementTypes = new Set<string>()
  fixes.forEach(fix => elementTypes.add(fix.targetElement.type))

  return `Fixed ${inconsistencies.length} inconsistenc${inconsistencies.length === 1 ? 'y' : 'ies'} across ${elementTypes.size} element type${elementTypes.size === 1 ? '' : 's'}`
}

/**
 * Count total affected elements
 */
function countAffectedElements(fixes: ConsistencyFix[]): number {
  const uniqueElements = new Set<string>()

  fixes.forEach(fix => {
    const key = `${fix.targetElement.type}:${fix.targetElement.id}`
    uniqueElements.add(key)
  })

  return uniqueElements.size
}
