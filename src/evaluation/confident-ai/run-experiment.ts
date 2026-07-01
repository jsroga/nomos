#!/usr/bin/env npx tsx
/**
 * Confident AI Experiment Runner
 *
 * Runs storyteller evaluations on Confident AI and returns
 * a shareable URL to view results.
 *
 * Usage:
 *   npx tsx src/evaluation/confident-ai/run-experiment.ts
 *   npx tsx src/evaluation/confident-ai/run-experiment.ts --quick
 *   npx tsx src/evaluation/confident-ai/run-experiment.ts --setup
 *   npm run eval confident-ai
 */

// Load environment variables first
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createStorytellerAgent } from '@/domains/storyteller'
import { getConfidentAIClient, getTestRunUrl, LLMTestCase, TestRunResponse } from './client'
import { setupConfidentAI, getCollectionNames } from './setup'
import { getTestCasesForEvaluation, printDatasetSummary } from './datasets'
import { getEvalTestCasesWithOutputs, EVAL_TEST_CASES } from './eval-dataset'
import { getABTestCases, AB_REGRESSION_TESTS, printABTestSummary } from './ab-regression-dataset'
import { StorytellerExample } from '../datasets/storyteller-golden'
import { langfuse } from '@/agent-core/observability'
import { getErrorMessage } from '@/lib/error-utils'

// ============================================
// Configuration
// ============================================

interface ExperimentConfig {
  name: string
  collection: 'full' | 'quick'
  categories?: string[]
  limit?: number
  hyperparameters?: Record<string, unknown>
}

const DEFAULT_CONFIG: ExperimentConfig = {
  name: 'Storyteller Evaluation',
  collection: 'full',
}

const QUICK_CONFIG: ExperimentConfig = {
  name: 'Storyteller Quick Check',
  collection: 'quick',
  categories: ['magic_score', 'consistency', 'creative_direction'],
  limit: 5,
}

const EVAL_CONFIG: ExperimentConfig = {
  name: 'High-Quality Eval',
  collection: 'quick',
  limit: 10,
  hyperparameters: {
    mode: 'pre-written',
    description: 'Uses pre-written high-quality outputs to verify metrics',
  },
}

// ============================================
// Output Generation
// ============================================

/**
 * Generate outputs for test cases using the storyteller agent
 */
async function generateOutputs(
  examples: StorytellerExample[],
  traceId: string
): Promise<Map<string, string>> {
  console.log(`\n🤖 Generating outputs for ${examples.length} test cases...`)

  const outputs = new Map<string, string>()
  const agent = await createStorytellerAgent()

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i]
    const input = example.input as { message: string; phase?: string }

    console.log(`  [${i + 1}/${examples.length}] ${example.id}: "${input.message.slice(0, 40)}..."`)

    try {
      // Build context for the agent
      const context = `Phase: ${input.phase || 'structure'}
Category: ${example.metadata?.category || 'general'}`

      // Generate output
      const output = await agent.run(input.message, context)
      outputs.set(example.id, output)

      // Record to Langfuse
      langfuse.event({
        traceId,
        name: `generate-${example.id}`,
        input: input.message,
        output: output.slice(0, 500),
        metadata: {
          exampleId: example.id,
          category: example.metadata?.category,
        },
      })
    } catch (error: unknown) {
      console.error(`    ❌ Error: ${getErrorMessage(error)}`)
      outputs.set(example.id, `[Error generating output: ${getErrorMessage(error)}]`)
    }
  }

  console.log(`✅ Generated ${outputs.size} outputs`)
  return outputs
}

// ============================================
// Experiment Runner
// ============================================

interface ExperimentResult {
  testRunId: string
  url: string
  testCaseCount: number
  collection: string
  identifier: string
}

/**
 * Run A/B regression test
 * Compares Version A (baseline) vs Version B (regression) outputs
 */
async function runABRegressionTest(version: 'A' | 'B'): Promise<ExperimentResult> {
  const client = getConfidentAIClient()
  const traceId = `confident-ai-ab-${version}-${Date.now()}`

  langfuse.trace({
    id: traceId,
    name: `A/B Regression Test: Version ${version}`,
    metadata: { version, testCount: AB_REGRESSION_TESTS.length },
    tags: ['evaluation', 'confident-ai', 'ab-test', `version-${version}`],
  })

  const isBaseline = version === 'A'
  console.log('\n' + '═'.repeat(60))
  console.log(`  🧪 A/B Regression Test: Version ${version}`)
  console.log(`  ${isBaseline ? '✅ Baseline (should PASS)' : '❌ Regression (should FAIL)'}`)
  console.log('═'.repeat(60))

  // Get test cases for this version
  const testCases = getABTestCases(version)

  console.log(`\n📋 Test cases: ${testCases.length}`)
  for (const test of AB_REGRESSION_TESTS) {
    const versionInfo = version === 'A' ? test.versionA : test.versionB
    console.log(`  - ${test.id}: ${test.name}`)
    console.log(`    ${versionInfo.label} → expect ${versionInfo.expectPass ? 'PASS' : 'FAIL'}`)
  }

  // Use quick collection
  const collections = getCollectionNames()
  const collectionName = collections.quick

  // Create unique identifier
  const identifier = `ab-test-version-${version}-${Date.now()}`

  console.log('\n📊 Running evaluation on Confident AI...')
  console.log(`   Collection: ${collectionName}`)
  console.log(`   Version: ${version} (${isBaseline ? 'Baseline' : 'Regression'})`)

  // Run evaluation with hyperparameters for experiment comparison
  const response: TestRunResponse = await client.evaluate({
    metricCollection: collectionName,
    llmTestCases: testCases,
    hyperparameters: {
      // Key hyperparameters for experiment comparison
      Model: 'storyteller-v2',
      Version: version,
      'Test Type': 'A/B Regression',
      Expectation: isBaseline ? 'should_pass' : 'should_fail',
      Temperature: '0.85',
      'Top P': '0.95',
    },
    identifier,
  })

  // Fetch test run details to get projectId
  const testRunDetails = await client.getTestRun(response.data.id)
  const projectId = (testRunDetails.data as any)?.testCases?.[0]?.metricsData?.[0]?.projectId
  const url = getTestRunUrl(response.data.id, projectId)

  langfuse.event({
    traceId,
    name: 'ab-test-completed',
    input: { version, testCaseCount: testCases.length },
    output: { testRunId: response.data.id, url },
  })

  await langfuse.flush()

  return {
    testRunId: response.data.id,
    url,
    testCaseCount: testCases.length,
    collection: collectionName,
    identifier,
  }
}

/**
 * Run evaluation with pre-written high-quality outputs
 * This tests if our expected outputs pass the metrics
 */
async function runEvalWithPrewrittenOutputs(config: ExperimentConfig): Promise<ExperimentResult> {
  const client = getConfidentAIClient()
  const traceId = `confident-ai-eval-${Date.now()}`

  langfuse.trace({
    id: traceId,
    name: `Confident AI Eval: ${config.name}`,
    metadata: { mode: 'pre-written', limit: config.limit },
    tags: ['evaluation', 'confident-ai', 'pre-written'],
  })

  console.log('\n' + '═'.repeat(60))
  console.log(`  🧪 ${config.name} (Pre-written Outputs)`)
  console.log('═'.repeat(60))

  // Get pre-written test cases
  const testCases = getEvalTestCasesWithOutputs()
  const limitedCases = config.limit ? testCases.slice(0, config.limit) : testCases

  console.log(`\n📋 Test cases: ${limitedCases.length}`)
  console.log('📝 Using pre-written high-quality outputs')

  // Log test case IDs
  const evalCases = config.limit ? EVAL_TEST_CASES.slice(0, config.limit) : EVAL_TEST_CASES
  for (const tc of evalCases) {
    console.log(`  - ${tc.id}: ${tc.description}`)
  }

  // Determine collection name
  const collections = getCollectionNames()
  const collectionName = config.collection === 'quick' ? collections.quick : collections.full

  // Create unique identifier for this run
  const identifier = `eval-prewritten-${Date.now()}`

  console.log('\n📊 Running evaluation on Confident AI...')
  console.log(`   Collection: ${collectionName}`)
  console.log(`   Identifier: ${identifier}`)

  // Run evaluation with pre-written outputs
  const response: TestRunResponse = await client.evaluate({
    metricCollection: collectionName,
    llmTestCases: limitedCases,
    hyperparameters: {
      model: 'pre-written-outputs',
      mode: 'eval-verification',
      temperature: '0.85',
      topP: '0.95',
      timestamp: new Date().toISOString(),
      ...config.hyperparameters,
    },
    identifier,
  })

  // Fetch test run details to get projectId
  const testRunDetails = await client.getTestRun(response.data.id)
  const projectId = (testRunDetails.data as any)?.testCases?.[0]?.metricsData?.[0]?.projectId
  const url = getTestRunUrl(response.data.id, projectId)

  langfuse.event({
    traceId,
    name: 'eval-completed',
    input: { testCaseCount: limitedCases.length },
    output: { testRunId: response.data.id, url },
  })

  await langfuse.flush()

  return {
    testRunId: response.data.id,
    url,
    testCaseCount: limitedCases.length,
    collection: collectionName,
    identifier,
  }
}

/**
 * Run an experiment on Confident AI
 */
async function runExperiment(config: ExperimentConfig): Promise<ExperimentResult> {
  const client = getConfidentAIClient()
  const traceId = `confident-ai-${Date.now()}`

  // Create trace for this experiment
  langfuse.trace({
    id: traceId,
    name: `Confident AI Experiment: ${config.name}`,
    metadata: {
      collection: config.collection,
      categories: config.categories,
      limit: config.limit,
    },
    tags: ['evaluation', 'confident-ai', 'experiment'],
  })

  console.log('\n' + '═'.repeat(60))
  console.log(`  🧪 ${config.name}`)
  console.log('═'.repeat(60))

  // Get test cases
  const { examples, testCases } = getTestCasesForEvaluation({
    categories: config.categories,
    limit: config.limit,
  })

  console.log(`\n📋 Test cases: ${testCases.length}`)

  // Generate outputs
  const outputs = await generateOutputs(examples, traceId)

  // Fill test cases with actual outputs
  const filledTestCases: LLMTestCase[] = testCases.map((tc, i) => ({
    ...tc,
    actualOutput: outputs.get(examples[i].id) || '',
  }))

  // Determine collection name
  const collections = getCollectionNames()
  const collectionName = config.collection === 'quick' ? collections.quick : collections.full

  // Create unique identifier for this run
  const identifier = `${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`

  console.log('\n📊 Running evaluation on Confident AI...')
  console.log(`   Collection: ${collectionName}`)
  console.log(`   Identifier: ${identifier}`)

  // Run evaluation with creative settings
  const response: TestRunResponse = await client.evaluate({
    metricCollection: collectionName,
    llmTestCases: filledTestCases,
    hyperparameters: {
      model: 'openai:gpt-4o',
      agent: 'storyteller-v2',
      // Creative generation settings (as strings per API requirement)
      temperature: '0.85',
      topP: '0.95',
      timestamp: new Date().toISOString(),
      ...config.hyperparameters,
    },
    identifier,
  })

  // Fetch test run details to get projectId for proper URL
  const testRunDetails = await client.getTestRun(response.data.id)
  // projectId is nested in testCases[0].metricsData[0].projectId
  const projectId = (testRunDetails.data as any)?.testCases?.[0]?.metricsData?.[0]?.projectId
  const url = getTestRunUrl(response.data.id, projectId)

  // Log result to Langfuse
  langfuse.event({
    traceId,
    name: 'experiment-completed',
    input: { testCaseCount: filledTestCases.length },
    output: { testRunId: response.data.id, url },
  })

  await langfuse.flush()

  return {
    testRunId: response.data.id,
    url,
    testCaseCount: filledTestCases.length,
    collection: collectionName,
    identifier,
  }
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2)

  // Handle --setup flag
  if (args.includes('--setup')) {
    await setupConfidentAI()
    printDatasetSummary()
    return
  }

  // Handle --stats flag
  if (args.includes('--stats')) {
    printDatasetSummary()
    return
  }

  // Handle --ab flag for A/B regression testing
  if (args.includes('--ab') || args.includes('--ab-test')) {
    console.log('🔧 Verifying Confident AI setup...')
    await setupConfidentAI()

    // Run both versions
    console.log('\n🧪 Running A/B Regression Tests...\n')
    printABTestSummary()

    const resultA = await runABRegressionTest('A')
    const resultB = await runABRegressionTest('B')

    console.log('\n' + '═'.repeat(60))
    console.log('  ✅ A/B REGRESSION TEST COMPLETE')
    console.log('═'.repeat(60))
    console.log('\n  Version A (Baseline - should PASS):')
    console.log(`    Test Run ID: ${resultA.testRunId}`)
    console.log(`    🔗 ${resultA.url}`)
    console.log('\n  Version B (Regression - should FAIL):')
    console.log(`    Test Run ID: ${resultB.testRunId}`)
    console.log(`    🔗 ${resultB.url}`)
    console.log('\n' + '═'.repeat(60))
    console.log('\n  📊 Compare results to detect regressions:')
    console.log('     - Version A should score HIGH (baseline quality)')
    console.log('     - Version B should score LOW (regression detected)')
    console.log('\n' + '═'.repeat(60) + '\n')
    return
  }

  // Determine config
  const isQuick = args.includes('--quick') || args.includes('-q')
  const isEval = args.includes('--eval') || args.includes('-e')

  let config: ExperimentConfig
  if (isEval) {
    config = { ...EVAL_CONFIG }
  } else if (isQuick) {
    config = { ...QUICK_CONFIG }
  } else {
    config = { ...DEFAULT_CONFIG }
  }

  // Allow custom name
  const nameIndex = args.indexOf('--name')
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    config.name = args[nameIndex + 1]
  }

  // Allow custom limit
  const limitIndex = args.indexOf('--limit')
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    config.limit = parseInt(args[limitIndex + 1], 10)
  }

  try {
    // Ensure setup is complete
    console.log('🔧 Verifying Confident AI setup...')
    await setupConfidentAI()

    // Run experiment (use pre-written outputs for --eval mode)
    const result = isEval ? await runEvalWithPrewrittenOutputs(config) : await runExperiment(config)

    // Print results
    console.log('\n' + '═'.repeat(60))
    console.log('  ✅ EXPERIMENT COMPLETE')
    console.log('═'.repeat(60))
    console.log(`\n  Test Run ID:  ${result.testRunId}`)
    console.log(`  Test Cases:   ${result.testCaseCount}`)
    console.log(`  Collection:   ${result.collection}`)
    console.log(`  Identifier:   ${result.identifier}`)
    console.log('\n  🔗 VIEW RESULTS:')
    console.log(`  ${result.url}`)
    console.log('\n' + '═'.repeat(60) + '\n')
  } catch (error: unknown) {
    console.error('\n❌ Experiment failed:', getErrorMessage(error))

    if (getErrorMessage(error).includes('CONFIDENT_AI_API_KEY')) {
      console.error('\n💡 To fix this:')
      console.error('   1. Sign up at https://app.confident-ai.com')
      console.error('   2. Get your Project API Key from Settings')
      console.error('   3. Add CONFIDENT_AI_API_KEY to your .env.local')
    }

    process.exit(1)
  }
}

// Export for programmatic use
export { runExperiment, ExperimentConfig, ExperimentResult }

// Run CLI
main()
