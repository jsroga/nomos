/**
 * Adapter Layer
 *
 * Converts existing storyteller evaluation types to Confident AI format.
 */

import { LLMTestCase, ConversationalTestCase } from './client'
import { EvaluationExample, StorytellerEvalInput } from '../types'
import { StorytellerExample } from '../datasets/storyteller-golden'

/**
 * Convert a storyteller evaluation example to a Confident AI LLMTestCase
 */
export function toConfidentAITestCase(
  example: EvaluationExample | StorytellerExample
): LLMTestCase {
  const input = example.input as StorytellerEvalInput

  // Build context from metadata
  const context: string[] = []

  if (input.phase) {
    context.push(`Phase: ${input.phase}`)
  }

  if (input.projectId) {
    context.push(`Project ID: ${input.projectId}`)
  }

  if (input.episodeId) {
    context.push(`Episode ID: ${input.episodeId}`)
  }

  if (example.metadata) {
    if (example.metadata.category) {
      context.push(`Category: ${example.metadata.category}`)
    }
    if (example.metadata.description) {
      context.push(`Description: ${example.metadata.description}`)
    }
    if (example.metadata.worldContext) {
      context.push(`World Context: ${JSON.stringify(example.metadata.worldContext)}`)
    }
  }

  return {
    input: input.message,
    actualOutput: '', // Will be filled during evaluation
    expectedOutput: example.expected?.response as string | undefined,
    context: context.length > 0 ? context : undefined,
  }
}

/**
 * Convert a batch of storyteller examples to Confident AI test cases
 */
function toConfidentAITestCases(
  examples: (EvaluationExample | StorytellerExample)[]
): LLMTestCase[] {
  return examples.map(toConfidentAITestCase)
}

/**
 * Convert test cases with actual outputs (post-generation) to Confident AI format
 */
function toConfidentAITestCaseWithOutput(
  example: EvaluationExample | StorytellerExample,
  actualOutput: string
): LLMTestCase {
  const baseCase = toConfidentAITestCase(example)
  return {
    ...baseCase,
    actualOutput,
  }
}

/**
 * Create a conversational test case from a multi-turn conversation
 */
function toConversationalTestCase(
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
  scenario?: string,
  expectedOutcome?: string
): ConversationalTestCase {
  return {
    turns,
    scenario,
    expectedOutcome,
  }
}

/**
 * Extract expected behavior metadata for test validation
 */
export interface ExpectedBehavior {
  shouldDelegate?: boolean
  expectedAgents?: string[]
  shouldHalt?: boolean
  shouldNotHalt?: boolean
  minMagicScore?: number
  maxMagicScore?: number
  requiresConsistency?: boolean
  noHallucinations?: boolean
}

function extractExpectedBehavior(example: StorytellerExample): ExpectedBehavior {
  return {
    shouldDelegate: example.expected?.shouldDelegate,
    expectedAgents: example.expected?.expectedAgents,
    shouldHalt: example.expected?.shouldHalt,
    shouldNotHalt: example.expected?.shouldNotHalt,
    minMagicScore: example.expected?.minMagicScore,
    maxMagicScore: example.expected?.maxMagicScore,
    requiresConsistency: example.expected?.requiresConsistency,
    noHallucinations: example.expected?.noHallucinations,
  }
}

/**
 * Group test cases by category for organized evaluation
 */
function groupByCategory(examples: StorytellerExample[]): Map<string, StorytellerExample[]> {
  const groups = new Map<string, StorytellerExample[]>()

  for (const example of examples) {
    const category = (example.metadata?.category as string) || 'uncategorized'
    const existing = groups.get(category) || []
    existing.push(example)
    groups.set(category, existing)
  }

  return groups
}

/**
 * Filter examples by criteria
 */
export function filterExamples(
  examples: StorytellerExample[],
  filter: {
    categories?: string[]
    hasMinMagicScore?: boolean
    hasDelegation?: boolean
    hasConsistency?: boolean
  }
): StorytellerExample[] {
  return examples.filter(ex => {
    if (filter.categories && filter.categories.length > 0) {
      const category = ex.metadata?.category as string
      if (!filter.categories.includes(category)) return false
    }

    if (filter.hasMinMagicScore && ex.expected?.minMagicScore === undefined) {
      return false
    }

    if (filter.hasDelegation && ex.expected?.shouldDelegate === undefined) {
      return false
    }

    if (filter.hasConsistency && !ex.expected?.requiresConsistency) {
      return false
    }

    return true
  })
}
