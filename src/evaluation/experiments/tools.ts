/**
 * Tools Experiment Runner
 *
 * Runs evaluation experiments on the new storyteller tools using LangSmith.
 * Tests tools directly with mock state (not through chat API).
 *
 * Usage: npm run eval:tools
 */

import { Client, Run } from 'langsmith'
import { evaluate } from 'langsmith/evaluation'
import {
  TOOLS_DATASET,
  ToolEvalInput,
  ToolEvalExpected,
  STATE_CONFIGS,
  createMockBeat,
  createMockCharacter,
} from '../datasets/tools-golden'
import {
  toolOutputEvaluator,
  toolSchemaEvaluator,
  toolConsistencyEvaluator,
  allToolEvaluators,
} from '../evaluators/tool-correctness'
import { CustomEvaluator, EvaluatorInput } from '../types'
import { WritersRoomState, createInitialState } from '../../domains/storyteller/graph/state'
import { Phase } from '../../domains/storyteller/enums'

// Tool imports
import {
  createBeatManagementTool,
  createBeatListTool,
} from '../../domains/storyteller/tools/beat-management-tools'
import {
  createContinuityCheckerTool,
  createQuickConsistencyTool,
} from '../../domains/storyteller/tools/continuity-tools'
import {
  createRelationshipAnalyzerTool,
  createRelationshipSuggestionTool,
} from '../../domains/storyteller/tools/character-relationship-tools'

// Configuration
const CONFIG = {
  datasetName: TOOLS_DATASET.name,
  experimentPrefix: 'tools-eval',
  maxConcurrency: 4,
  projectId: 'test-project-001',
  episodeId: 'test-episode-001',
}

/**
 * Create a mock WritersRoomState with optional overrides
 */
function createMockState(overrides?: Partial<WritersRoomState>): WritersRoomState {
  return createInitialState({
    projectId: CONFIG.projectId,
    episodeId: CONFIG.episodeId,
    currentPhase: Phase.STRUCTURE,
    ...overrides,
  })
}

/**
 * Get tool instance by name
 */
function getToolByName(toolName: string, state: WritersRoomState) {
  const toolMap: Record<string, ReturnType<typeof createBeatManagementTool>> = {
    manage_beat: createBeatManagementTool(state),
    list_beats: createBeatListTool(state),
    check_continuity: createContinuityCheckerTool(state),
    quick_consistency_check: createQuickConsistencyTool(state),
    analyze_relationships: createRelationshipAnalyzerTool(state),
    suggest_relationship_dynamic: createRelationshipSuggestionTool(state),
  }

  return toolMap[toolName]
}

/**
 * Tool evaluation output type
 */
interface ToolEvalOutput {
  result: string
  parsedResult?: Record<string, unknown>
  error?: string
  latencyMs: number
}

/**
 * Target function: Invokes tools directly with mock state
 */
async function toolTarget(input: Record<string, unknown>): Promise<ToolEvalOutput> {
  const toolInput = input as ToolEvalInput
  const startTime = Date.now()

  try {
    // Create state with overrides
    const stateOverrides = toolInput.stateOverrides || {}
    const state = createMockState(stateOverrides)

    // Get the tool
    const tool = getToolByName(toolInput.tool, state)

    if (!tool) {
      return {
        result: JSON.stringify({ success: false, error: `Unknown tool: ${toolInput.tool}` }),
        error: `Unknown tool: ${toolInput.tool}`,
        latencyMs: Date.now() - startTime,
      }
    }

    // Invoke the tool
    const result = await tool.invoke(toolInput.args)
    const latencyMs = Date.now() - startTime

    // Try to parse result
    let parsedResult: Record<string, unknown> | undefined
    try {
      parsedResult = JSON.parse(result)
    } catch {
      // Result might not be JSON
    }

    return {
      result,
      parsedResult,
      latencyMs,
    }
  } catch (error) {
    return {
      result: JSON.stringify({ success: false, error: String(error) }),
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Convert our custom evaluators to LangSmith format
 */
function wrapEvaluator(evaluator: CustomEvaluator) {
  return {
    evaluatorName: evaluator.name,
    evaluator: async (
      run: Run,
      example?: { inputs: Record<string, unknown>; outputs?: Record<string, unknown> }
    ) => {
      const evalInput: EvaluatorInput = {
        input: example?.inputs || run.inputs || {},
        output: run.outputs || {},
        reference: example?.outputs,
      }

      const result = await evaluator.evaluate(evalInput)

      return {
        key: evaluator.name,
        score: result.score,
        comment: result.reasoning,
      }
    },
  }
}

/**
 * Latency evaluator - checks if tool executes within acceptable time
 */
const latencyEvaluator: CustomEvaluator = {
  name: 'latency',
  evaluate: async (params: EvaluatorInput) => {
    const output = params.output as ToolEvalOutput
    const latencyMs = output?.latencyMs || 0

    // Score based on latency thresholds
    let score = 1.0
    if (latencyMs > 500) score = 0.7
    if (latencyMs > 1000) score = 0.4
    if (latencyMs > 2000) score = 0.1

    return {
      score,
      reasoning: `Latency: ${latencyMs}ms (threshold: 500ms)`,
      metadata: { latencyMs },
    }
  },
}

/**
 * Run the tools experiment
 */
export async function runToolsExperiment() {
  console.log('🔧 Starting Tools Evaluation Experiment')
  console.log('============================================')
  console.log(`Dataset: ${CONFIG.datasetName}`)
  console.log(`Total test cases: ${TOOLS_DATASET.examples.length}`)
  console.log('')

  // Check environment
  const hasLangSmith = !!process.env.LANGCHAIN_API_KEY

  if (hasLangSmith) {
    console.log('✅ LangSmith API key found - will upload results')
  } else {
    console.log('⚠️  LANGCHAIN_API_KEY not set - running locally only')
  }
  console.log('')

  const evaluators = [...allToolEvaluators, latencyEvaluator]

  console.log(`📊 Using ${evaluators.length} evaluators:`)
  evaluators.forEach(e => console.log(`   - ${e.name}`))
  console.log('')

  try {
    if (hasLangSmith) {
      const client = new Client({
        apiKey: process.env.LANGCHAIN_API_KEY,
      })

      // Check if dataset exists
      let datasetExists = false
      try {
        await client.readDataset({ datasetName: CONFIG.datasetName })
        datasetExists = true
      } catch {
        console.log(`⚠️  Dataset '${CONFIG.datasetName}' not found in LangSmith`)
        console.log('   Creating dataset...')

        // Create the dataset
        const dataset = await client.createDataset(CONFIG.datasetName, {
          description: TOOLS_DATASET.description,
        })

        // Upload examples
        for (const example of TOOLS_DATASET.examples) {
          await client.createExample(example.input, example.expected, {
            datasetId: dataset.id,
            metadata: example.metadata,
          })
        }

        console.log(`   ✅ Created dataset with ${TOOLS_DATASET.examples.length} examples`)
        datasetExists = true
      }

      if (datasetExists) {
        // Run with LangSmith
        const results = await evaluate(toolTarget, {
          data: CONFIG.datasetName,
          evaluators: evaluators.map(e => wrapEvaluator(e).evaluator),
          experimentPrefix: CONFIG.experimentPrefix,
          maxConcurrency: CONFIG.maxConcurrency,
          client,
        })

        console.log('')
        console.log('✅ Experiment complete!')
        console.log('   View results at: https://smith.langchain.com')

        return results
      }
    }

    // Run locally
    return await runLocalExperiment(evaluators)
  } catch (error) {
    console.error('❌ Experiment failed:', error)
    throw error
  }
}

/**
 * Run experiment locally without LangSmith
 */
async function runLocalExperiment(evaluators: CustomEvaluator[]) {
  console.log('📋 Running local evaluation...')
  console.log('')

  const results: Array<{
    id: string
    tool: string
    scores: Record<string, number>
    passed: boolean
    latencyMs: number
  }> = []

  // Group examples by tool for cleaner output
  const byTool = new Map<string, typeof TOOLS_DATASET.examples>()
  for (const example of TOOLS_DATASET.examples) {
    const tool = (example.input as ToolEvalInput).tool
    if (!byTool.has(tool)) byTool.set(tool, [])
    byTool.get(tool)!.push(example)
  }

  for (const [tool, examples] of byTool) {
    console.log(`\n📦 Testing: ${tool}`)
    console.log('─'.repeat(40))

    for (const example of examples) {
      const output = await toolTarget(example.input)

      const scores: Record<string, number> = {}
      for (const evaluator of evaluators) {
        const evalResult = await evaluator.evaluate({
          input: example.input,
          output,
          reference: example.expected,
        })
        scores[evaluator.name] = evalResult.score
      }

      const avgScore =
        Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
      const passed = avgScore >= 0.7

      results.push({
        id: example.id,
        tool,
        scores,
        passed,
        latencyMs: output.latencyMs,
      })

      const status = passed ? '✅' : '❌'
      const desc = (example.metadata as Record<string, unknown>)?.description || example.id
      console.log(
        `${status} ${example.id}: ${(avgScore * 100).toFixed(0)}% (${output.latencyMs}ms)`
      )

      if (!passed) {
        console.log(
          `   Scores: ${Object.entries(scores)
            .map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`)
            .join(', ')}`
        )
      }
    }
  }

  // Summary
  console.log('')
  console.log('============================================')
  console.log('📊 Summary')
  console.log('============================================')

  const passedCount = results.filter(r => r.passed).length
  const totalCount = results.length
  const passRate = ((passedCount / totalCount) * 100).toFixed(1)

  console.log(`\nOverall: ${passedCount}/${totalCount} passed (${passRate}%)`)

  // By tool
  console.log('\nBy Tool:')
  for (const [tool, examples] of byTool) {
    const toolResults = results.filter(r => r.tool === tool)
    const toolPassed = toolResults.filter(r => r.passed).length
    const toolAvgLatency = toolResults.reduce((s, r) => s + r.latencyMs, 0) / toolResults.length
    console.log(
      `  ${tool}: ${toolPassed}/${toolResults.length} passed, avg ${toolAvgLatency.toFixed(0)}ms`
    )
  }

  // Average scores by evaluator
  console.log('\nAverage Scores by Evaluator:')
  const aggregated: Record<string, number[]> = {}
  for (const result of results) {
    for (const [key, score] of Object.entries(result.scores)) {
      if (!aggregated[key]) aggregated[key] = []
      aggregated[key].push(score)
    }
  }

  for (const [key, scores] of Object.entries(aggregated)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const bar = '█'.repeat(Math.round(avg * 20)) + '░'.repeat(20 - Math.round(avg * 20))
    console.log(`  ${key.padEnd(20)} ${bar} ${(avg * 100).toFixed(1)}%`)
  }

  // Failed tests
  const failed = results.filter(r => !r.passed)
  if (failed.length > 0) {
    console.log(`\n❌ Failed Tests (${failed.length}):`)
    failed.forEach(f => {
      console.log(`  - ${f.id} (${f.tool})`)
    })
  }

  // Latency stats
  const latencies = results.map(r => r.latencyMs)
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
  const maxLatency = Math.max(...latencies)
  const minLatency = Math.min(...latencies)

  console.log(
    `\n⏱️  Latency: avg=${avgLatency.toFixed(0)}ms, min=${minLatency}ms, max=${maxLatency}ms`
  )

  // Return results object
  return {
    total: totalCount,
    passed: passedCount,
    failed: totalCount - passedCount,
    passRate: parseFloat(passRate),
    results,
  }
}

/**
 * Run a single tool test (useful for debugging)
 */
export async function runSingleTest(exampleId: string) {
  const example = TOOLS_DATASET.examples.find(e => e.id === exampleId)

  if (!example) {
    console.error(`Example not found: ${exampleId}`)
    return null
  }

  console.log(`Testing: ${exampleId}`)
  console.log('Input:', JSON.stringify(example.input, null, 2))

  const output = await toolTarget(example.input)

  console.log('Output:', JSON.stringify(output, null, 2))

  // Run evaluators
  for (const evaluator of allToolEvaluators) {
    const result = await evaluator.evaluate({
      input: example.input,
      output,
      reference: example.expected,
    })
    console.log(`${evaluator.name}: ${result.score.toFixed(2)} - ${result.reasoning}`)
  }

  return output
}

// Run if executed directly
if (require.main === module) {
  // Check for single test mode
  const testId = process.argv[2]

  if (testId) {
    runSingleTest(testId)
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Fatal error:', err)
        process.exit(1)
      })
  } else {
    runToolsExperiment()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Fatal error:', err)
        process.exit(1)
      })
  }
}
