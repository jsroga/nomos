/**
 * Tool Correctness Evaluators
 *
 * Custom evaluators for validating storyteller tool outputs:
 * 1. toolOutputEvaluator - Verifies tool output format and success
 * 2. toolSchemaEvaluator - Validates output matches expected schema
 * 3. toolConsistencyEvaluator - Checks state mutations are consistent
 */

import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'
import { ToolEvalExpected } from '../datasets/tools-golden'

/**
 * Parse tool output safely
 */
function parseToolOutput(output: Record<string, unknown>): Record<string, unknown> | null {
  try {
    // Tool outputs are JSON strings
    const result = output.result
    if (typeof result === 'string') {
      return JSON.parse(result)
    }
    if (typeof result === 'object') {
      return result as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if a value contains all specified substrings (case-insensitive)
 */
function containsAll(value: string, substrings: string[]): { pass: boolean; missing: string[] } {
  const valueLower = value.toLowerCase()
  const missing = substrings.filter(s => !valueLower.includes(s.toLowerCase()))
  return { pass: missing.length === 0, missing }
}

/**
 * Check if a value contains none of the specified substrings
 */
function containsNone(value: string, substrings: string[]): { pass: boolean; found: string[] } {
  const valueLower = value.toLowerCase()
  const found = substrings.filter(s => valueLower.includes(s.toLowerCase()))
  return { pass: found.length === 0, found }
}

/**
 * Check if object has all specified fields
 */
function hasFields(
  obj: Record<string, unknown>,
  fields: string[]
): { pass: boolean; missing: string[] } {
  const missing = fields.filter(f => !(f in obj))
  return { pass: missing.length === 0, missing }
}

/**
 * Check if object has specific field values
 */
function hasFieldValues(
  obj: Record<string, unknown>,
  expected: Record<string, unknown>
): { pass: boolean; mismatches: string[] } {
  const mismatches: string[] = []

  for (const [key, value] of Object.entries(expected)) {
    if (obj[key] !== value) {
      mismatches.push(`${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(obj[key])}`)
    }
  }

  return { pass: mismatches.length === 0, mismatches }
}

// ========================================
// EVALUATOR 1: Tool Output Evaluator
// ========================================

/**
 * Verifies tool output format and success status.
 *
 * Checks:
 * - Output is valid JSON
 * - Success field matches expected
 * - Output contains expected substrings
 * - Output doesn't contain forbidden substrings
 */
export const toolOutputEvaluator: CustomEvaluator = {
  name: 'tool_output',
  evaluate: async (params: EvaluatorInput): Promise<EvaluatorResult> => {
    const { output, reference } = params
    const expected = reference as ToolEvalExpected | undefined

    if (!expected) {
      return {
        score: 0.5,
        reasoning: 'No expected output defined, cannot evaluate',
      }
    }

    const parsed = parseToolOutput(output)

    if (!parsed) {
      return {
        score: 0,
        reasoning: 'Tool output is not valid JSON',
        metadata: { rawOutput: JSON.stringify(output).slice(0, 200) },
      }
    }

    const issues: string[] = []
    let score = 1.0

    // Check success status
    if ('success' in parsed) {
      if (parsed.success !== expected.success) {
        issues.push(`Success mismatch: expected ${expected.success}, got ${parsed.success}`)
        score -= 0.4
      }
    }

    // Check contains
    if (expected.outputContains) {
      const outputStr = JSON.stringify(parsed)
      const { pass, missing } = containsAll(outputStr, expected.outputContains)
      if (!pass) {
        issues.push(`Missing expected content: ${missing.join(', ')}`)
        score -= 0.2 * missing.length
      }
    }

    // Check not contains
    if (expected.outputNotContains) {
      const outputStr = JSON.stringify(parsed)
      const { pass, found } = containsNone(outputStr, expected.outputNotContains)
      if (!pass) {
        issues.push(`Found forbidden content: ${found.join(', ')}`)
        score -= 0.2 * found.length
      }
    }

    // Check error message if expected to fail
    if (!expected.success && expected.errorContains) {
      const errorStr = String(parsed.error || parsed.message || '')
      if (!errorStr.toLowerCase().includes(expected.errorContains.toLowerCase())) {
        issues.push(`Error message doesn't contain: ${expected.errorContains}`)
        score -= 0.2
      }
    }

    return {
      score: Math.max(0, score),
      reasoning: issues.length > 0 ? issues.join('; ') : 'All output checks passed',
      metadata: { issueCount: issues.length },
    }
  },
}

// ========================================
// EVALUATOR 2: Tool Schema Evaluator
// ========================================

/**
 * Validates output matches expected schema.
 *
 * Checks:
 * - Required fields are present
 * - Field values match expected
 */
export const toolSchemaEvaluator: CustomEvaluator = {
  name: 'tool_schema',
  evaluate: async (params: EvaluatorInput): Promise<EvaluatorResult> => {
    const { output, reference } = params
    const expected = reference as ToolEvalExpected | undefined

    if (!expected) {
      return {
        score: 0.5,
        reasoning: 'No expected output defined, cannot evaluate schema',
      }
    }

    const parsed = parseToolOutput(output)

    if (!parsed) {
      return {
        score: 0,
        reasoning: 'Tool output is not valid JSON, cannot check schema',
      }
    }

    const issues: string[] = []
    let score = 1.0

    // Check required fields
    if (expected.hasField) {
      const { pass, missing } = hasFields(parsed, expected.hasField)
      if (!pass) {
        issues.push(`Missing required fields: ${missing.join(', ')}`)
        score -= 0.25 * missing.length
      }
    }

    // Check field values
    if (expected.fieldValue) {
      const { pass, mismatches } = hasFieldValues(parsed, expected.fieldValue)
      if (!pass) {
        issues.push(`Field value mismatches: ${mismatches.join('; ')}`)
        score -= 0.3 * mismatches.length
      }
    }

    return {
      score: Math.max(0, score),
      reasoning: issues.length > 0 ? issues.join('; ') : 'Schema validation passed',
      metadata: {
        fieldsChecked: expected.hasField?.length || 0,
        valuesChecked: Object.keys(expected.fieldValue || {}).length,
      },
    }
  },
}

// ========================================
// EVALUATOR 3: Tool Consistency Evaluator
// ========================================

/**
 * Checks that tool operations are internally consistent.
 *
 * For example:
 * - Create operation returns a valid beat ID
 * - Delete operation removes the beat
 * - Update operation preserves unchanged fields
 */
export const toolConsistencyEvaluator: CustomEvaluator = {
  name: 'tool_consistency',
  evaluate: async (params: EvaluatorInput): Promise<EvaluatorResult> => {
    const { input, output, reference } = params
    const expected = reference as ToolEvalExpected | undefined
    const toolInput = input as { tool?: string; args?: Record<string, unknown> }

    const parsed = parseToolOutput(output)

    if (!parsed) {
      return {
        score: 0,
        reasoning: 'Tool output is not valid JSON, cannot check consistency',
      }
    }

    const issues: string[] = []
    let score = 1.0

    const toolName = toolInput.tool || ''
    const operation = (toolInput.args?.operation as string) || ''

    // Tool-specific consistency checks
    switch (toolName) {
      case 'manage_beat': {
        // Check create returns beat with ID
        if (operation === 'create' && parsed.success) {
          const beat = parsed.beat as Record<string, unknown> | undefined
          if (!beat?.id) {
            issues.push('Create operation should return beat with ID')
            score -= 0.3
          }
          if (beat?.sequence === undefined) {
            issues.push('Create operation should return beat with sequence')
            score -= 0.2
          }
        }

        // Check delete returns deleted ID
        if (operation === 'delete' && parsed.success) {
          if (!parsed.deletedId) {
            issues.push('Delete operation should return deletedId')
            score -= 0.3
          }
        }

        // Check list returns array
        if (operation === 'list' && parsed.success) {
          if (!Array.isArray(parsed.beats)) {
            issues.push('List operation should return beats array')
            score -= 0.4
          }
        }

        // Check duplicate returns new beat
        if (operation === 'duplicate' && parsed.success) {
          const newBeat = parsed.newBeat as Record<string, unknown> | undefined
          if (!newBeat?.id) {
            issues.push('Duplicate operation should return newBeat with ID')
            score -= 0.3
          }
        }
        break
      }

      case 'check_continuity': {
        // Summary should always be present on success
        if (parsed.success) {
          if (!parsed.summary && !parsed.message) {
            issues.push('Continuity check should return summary or message')
            score -= 0.3
          }
        }

        // Issues should be an array if present
        if (parsed.issues && !Array.isArray(parsed.issues)) {
          issues.push('Issues should be an array')
          score -= 0.2
        }
        break
      }

      case 'analyze_relationships': {
        // Character-specific checks
        if (parsed.success && toolInput.args?.focus === 'character_focus') {
          if (!parsed.character) {
            issues.push('Character focus should return character name')
            score -= 0.3
          }
        }

        // Cluster analysis checks
        if (parsed.success && toolInput.args?.focus === 'cluster_analysis') {
          if (!Array.isArray(parsed.clusters)) {
            issues.push('Cluster analysis should return clusters array')
            score -= 0.3
          }
        }

        // Full matrix checks
        if (parsed.success && toolInput.args?.focus === 'full_matrix') {
          if (typeof parsed.totalCharacters !== 'number') {
            issues.push('Full matrix should return totalCharacters count')
            score -= 0.2
          }
        }
        break
      }
    }

    // Error messages should be informative
    if (!parsed.success) {
      const hasError = parsed.error || parsed.message
      if (!hasError) {
        issues.push('Failed operations should include error message')
        score -= 0.2
      }
    }

    return {
      score: Math.max(0, score),
      reasoning: issues.length > 0 ? issues.join('; ') : 'Consistency checks passed',
      metadata: {
        tool: toolName,
        operation,
        issueCount: issues.length,
      },
    }
  },
}

// ========================================
// HEURISTIC VERSIONS (No LLM required)
// ========================================

/**
 * Heuristic version of tool output evaluator.
 * Same as LLM version since it doesn't use LLM.
 */

/**
 * Heuristic version of tool schema evaluator.
 * Same as LLM version since it doesn't use LLM.
 */

/**
 * Heuristic version of tool consistency evaluator.
 * Same as LLM version since it doesn't use LLM.
 */

// ========================================
// COMBINED EVALUATOR
// ========================================

/**
 * Combined evaluator that runs all three checks and averages scores.
 */
export const toolCorrectnessEvaluator: CustomEvaluator = {
  name: 'tool_correctness',
  evaluate: async (params: EvaluatorInput): Promise<EvaluatorResult> => {
    const results = await Promise.all([
      toolOutputEvaluator.evaluate(params),
      toolSchemaEvaluator.evaluate(params),
      toolConsistencyEvaluator.evaluate(params),
    ])

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    const allReasons = results.map(r => `[${r.score.toFixed(2)}] ${r.reasoning}`).join(' | ')

    return {
      score: avgScore,
      reasoning: allReasons,
      metadata: {
        outputScore: results[0].score,
        schemaScore: results[1].score,
        consistencyScore: results[2].score,
      },
    }
  },
}

// Export all evaluators
export const allToolEvaluators = [
  toolOutputEvaluator,
  toolSchemaEvaluator,
  toolConsistencyEvaluator,
]
