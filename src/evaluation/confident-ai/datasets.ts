/**
 * Dataset Management for Confident AI
 * 
 * Converts and manages storyteller datasets on Confident AI.
 */

import { getConfidentAIClient, LLMTestCase } from './client'
import { toConfidentAITestCase, groupByCategory, filterExamples } from './adapter'
import { STORYTELLER_GOLDEN_DATASET, STORYTELLER_EXAMPLES, StorytellerExample } from '../datasets/storyteller-golden'

const DATASET_ALIAS = 'storyteller-golden-v2'
const DATASET_QUICK_ALIAS = 'storyteller-quick'

/**
 * Convert and optionally push the golden dataset to Confident AI
 */
export async function pushGoldenDataset(): Promise<{ alias: string; count: number }> {
  const client = getConfidentAIClient()
  
  console.log('📤 Pushing golden dataset to Confident AI...')
  
  const goldens = STORYTELLER_EXAMPLES.map(ex => {
    const input = ex.input as { message: string }
    return {
      input: input.message,
      expectedOutput: ex.expected?.response as string | undefined,
      context: [
        `Phase: ${ex.input.phase || 'unknown'}`,
        `Category: ${ex.metadata?.category || 'uncategorized'}`,
        ex.metadata?.description ? `Description: ${ex.metadata.description}` : '',
      ].filter(Boolean),
    }
  })
  
  await client.pushDataset(DATASET_ALIAS, goldens)
  
  console.log(`✅ Pushed ${goldens.length} goldens to dataset: ${DATASET_ALIAS}`)
  
  return { alias: DATASET_ALIAS, count: goldens.length }
}

/**
 * Push a quick/subset dataset for faster iteration
 */
export async function pushQuickDataset(): Promise<{ alias: string; count: number }> {
  const client = getConfidentAIClient()
  
  console.log('📤 Pushing quick dataset to Confident AI...')
  
  // Select a representative subset
  const quickExamples = filterExamples(STORYTELLER_EXAMPLES, {
    categories: ['magic_score', 'consistency', 'creative_direction', 'delegation'],
  }).slice(0, 10)
  
  const goldens = quickExamples.map(ex => {
    const input = ex.input as { message: string }
    return {
      input: input.message,
      expectedOutput: ex.expected?.response as string | undefined,
      context: [
        `Phase: ${ex.input.phase || 'unknown'}`,
        `Category: ${ex.metadata?.category || 'uncategorized'}`,
      ],
    }
  })
  
  await client.pushDataset(DATASET_QUICK_ALIAS, goldens)
  
  console.log(`✅ Pushed ${goldens.length} goldens to quick dataset: ${DATASET_QUICK_ALIAS}`)
  
  return { alias: DATASET_QUICK_ALIAS, count: goldens.length }
}

/**
 * Get test cases for evaluation (with actual outputs to be filled)
 */
export function getTestCasesForEvaluation(
  options?: {
    categories?: string[]
    limit?: number
    includeActualOutputs?: Map<string, string>
  }
): { examples: StorytellerExample[]; testCases: LLMTestCase[] } {
  let examples = STORYTELLER_EXAMPLES
  
  // Filter by category if specified
  if (options?.categories && options.categories.length > 0) {
    examples = filterExamples(examples, { categories: options.categories })
  }
  
  // Apply limit if specified
  if (options?.limit && options.limit > 0) {
    examples = examples.slice(0, options.limit)
  }
  
  // Convert to test cases
  const testCases = examples.map(ex => {
    const testCase = toConfidentAITestCase(ex)
    
    // Fill actual output if provided
    if (options?.includeActualOutputs && options.includeActualOutputs.has(ex.id)) {
      testCase.actualOutput = options.includeActualOutputs.get(ex.id)!
    }
    
    return testCase
  })
  
  return { examples, testCases }
}

/**
 * Get dataset statistics
 */
export function getDatasetStats(): {
  total: number
  byCategory: Map<string, number>
  withMagicScore: number
  withConsistency: number
  withDelegation: number
} {
  const byCategory = new Map<string, number>()
  let withMagicScore = 0
  let withConsistency = 0
  let withDelegation = 0
  
  for (const ex of STORYTELLER_EXAMPLES) {
    // Count by category
    const category = (ex.metadata?.category as string) || 'uncategorized'
    byCategory.set(category, (byCategory.get(category) || 0) + 1)
    
    // Count special properties
    if (ex.expected?.minMagicScore !== undefined || ex.expected?.maxMagicScore !== undefined) {
      withMagicScore++
    }
    if (ex.expected?.requiresConsistency) {
      withConsistency++
    }
    if (ex.expected?.shouldDelegate !== undefined) {
      withDelegation++
    }
  }
  
  return {
    total: STORYTELLER_EXAMPLES.length,
    byCategory,
    withMagicScore,
    withConsistency,
    withDelegation,
  }
}

/**
 * Print dataset summary
 */
export function printDatasetSummary(): void {
  const stats = getDatasetStats()
  
  console.log('\n📊 Storyteller Golden Dataset Summary')
  console.log('═'.repeat(50))
  console.log(`Total examples: ${stats.total}`)
  console.log(`With magic score criteria: ${stats.withMagicScore}`)
  console.log(`With consistency checks: ${stats.withConsistency}`)
  console.log(`With delegation tests: ${stats.withDelegation}`)
  console.log('\nBy Category:')
  
  const sortedCategories = [...stats.byCategory.entries()].sort((a, b) => b[1] - a[1])
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category}: ${count}`)
  }
  
  console.log('═'.repeat(50))
}
