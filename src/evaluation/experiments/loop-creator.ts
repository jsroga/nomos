/**
 * Loop Creator Experiment Runner
 * 
 * Runs evaluation experiments on the loop creator agent using LangSmith.
 * 
 * Usage: npm run eval:loop-creator
 */

import { Client, Run } from 'langsmith'
import { evaluate } from 'langsmith/evaluation'
import { LOOP_CREATOR_DATASET } from '../datasets/loop-creator-golden'
import { consistencyHeuristic } from '../evaluators/consistency'
import { hallucinationHeuristic } from '../evaluators/hallucination'
import { CustomEvaluator, EvaluatorInput } from '../types'

// Configuration
const CONFIG = {
  datasetName: LOOP_CREATOR_DATASET.name,
  experimentPrefix: 'loop-creator-eval',
  maxConcurrency: 4,
  apiUrl: process.env.LOOP_API_URL || 'http://localhost:3000/api/loop-creator/chat',
}

/**
 * Loop Creator specific evaluator: Mechanics Generation
 */
const mechanicsGenerationEvaluator: CustomEvaluator = {
  name: 'mechanics-generation',

  evaluate: async ({ output, reference }: EvaluatorInput) => {
    const outputStr = JSON.stringify(output)
    const expected = reference as {
      shouldGenerateMechanics?: boolean
      expectedMechanicTypes?: string[]
    } | undefined

    // Check if mechanics were generated
    const hasMechanics =
      /mechanic/i.test(outputStr) ||
      /\{[^}]*"id"[^}]*"name"[^}]*\}/i.test(outputStr)

    if (expected?.shouldGenerateMechanics === false && hasMechanics) {
      return {
        score: 0.5,
        reasoning: 'Generated mechanics when not expected',
      }
    }

    if (expected?.shouldGenerateMechanics === true && !hasMechanics) {
      return {
        score: 0,
        reasoning: 'Expected mechanics generation but none found',
      }
    }

    // Check mechanic types if expected
    if (expected?.expectedMechanicTypes) {
      const outputLower = outputStr.toLowerCase()
      const foundTypes = expected.expectedMechanicTypes.filter((type) =>
        outputLower.includes(type.toLowerCase().replace(/_/g, ' '))
      )

      const coverage = foundTypes.length / expected.expectedMechanicTypes.length
      return {
        score: coverage,
        reasoning: `Found ${foundTypes.length}/${expected.expectedMechanicTypes.length} expected mechanic types`,
        metadata: { foundTypes, expectedTypes: expected.expectedMechanicTypes },
      }
    }

    return {
      score: 1.0,
      reasoning: 'Mechanics generation check passed',
    }
  },
}

/**
 * Loop Creator specific evaluator: Loop Structure
 */
const loopStructureEvaluator: CustomEvaluator = {
  name: 'loop-structure',

  evaluate: async ({ output, reference }: EvaluatorInput) => {
    const outputStr = JSON.stringify(output)
    const expected = reference as {
      shouldCreateLoop?: boolean
    } | undefined

    // Check for loop indicators
    const hasLoop =
      /loop/i.test(outputStr) ||
      /\bcycle\b/i.test(outputStr) ||
      /\bcore.*flow\b/i.test(outputStr) ||
      /\bfeedback\b/i.test(outputStr)

    if (expected?.shouldCreateLoop === true && !hasLoop) {
      return {
        score: 0,
        reasoning: 'Expected loop creation but none detected',
      }
    }

    if (expected?.shouldCreateLoop === false && hasLoop) {
      return {
        score: 0.7,
        reasoning: 'Created loop when not explicitly requested (might be okay)',
      }
    }

    return {
      score: 1.0,
      reasoning: 'Loop structure check passed',
    }
  },
}

/**
 * Loop Creator specific evaluator: Balance Analysis
 */
const balanceAnalysisEvaluator: CustomEvaluator = {
  name: 'balance-analysis',

  evaluate: async ({ output, reference }: EvaluatorInput) => {
    const outputStr = JSON.stringify(output)
    const expected = reference as {
      shouldAnalyzeBalance?: boolean
      minBalanceScore?: number
    } | undefined

    // Check for balance analysis indicators
    const hasBalanceAnalysis =
      /balance/i.test(outputStr) ||
      /effort.*reward/i.test(outputStr) ||
      /dead.*end/i.test(outputStr) ||
      /grind/i.test(outputStr)

    if (expected?.shouldAnalyzeBalance === true && !hasBalanceAnalysis) {
      return {
        score: 0.3,
        reasoning: 'Expected balance analysis but none found',
      }
    }

    // Extract balance score if present
    const scoreMatch = outputStr.match(/(?:balance|overall).*?score["\s:]+(\d+)/i)
    if (scoreMatch && expected?.minBalanceScore) {
      const foundScore = parseInt(scoreMatch[1])
      if (foundScore < expected.minBalanceScore) {
        return {
          score: foundScore / 10,
          reasoning: `Balance score ${foundScore} below minimum ${expected.minBalanceScore}`,
          metadata: { balanceScore: foundScore },
        }
      }
    }

    return {
      score: 1.0,
      reasoning: 'Balance analysis check passed',
    }
  },
}

/**
 * Target function: Calls the loop creator API
 */
async function loopCreatorTarget(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const message = input.message as string
  const gameContext = input.gameContext as Record<string, string> | undefined

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        gameContext,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Read stream response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullResponse += decoder.decode(value, { stream: true })
      }
    }

    return {
      response: fullResponse,
    }
  } catch (error) {
    return {
      response: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Convert evaluators to LangSmith format
 */
function wrapEvaluator(evaluator: CustomEvaluator) {
  return {
    evaluatorName: evaluator.name,
    evaluator: async (run: Run, example?: { inputs: Record<string, unknown>; outputs?: Record<string, unknown> }) => {
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
    }
  }
}

/**
 * Run the loop creator experiment
 */
export async function runLoopCreatorExperiment() {
  console.log('🚀 Starting Loop Creator Evaluation Experiment')
  console.log('=============================================')
  console.log(`Dataset: ${CONFIG.datasetName}`)
  console.log(`API URL: ${CONFIG.apiUrl}`)
  console.log('')

  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ LANGCHAIN_API_KEY is not set')
    process.exit(1)
  }

  const client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  const evaluators = [
    wrapEvaluator(mechanicsGenerationEvaluator),
    wrapEvaluator(loopStructureEvaluator),
    wrapEvaluator(balanceAnalysisEvaluator),
    wrapEvaluator(consistencyHeuristic),
    wrapEvaluator(hallucinationHeuristic),
  ]

  console.log(`📊 Using ${evaluators.length} evaluators`)
  console.log('')

  try {
    let datasetExists = false
    try {
      await client.readDataset({ datasetName: CONFIG.datasetName })
      datasetExists = true
    } catch {
      console.log(`⚠️  Dataset '${CONFIG.datasetName}' not found`)
      console.log('   Run: npm run eval:upload-datasets first')
      console.log('')
    }

    if (datasetExists) {
      const results = await evaluate(loopCreatorTarget, {
        data: CONFIG.datasetName,
        evaluators: evaluators.map(e => e.evaluator),
        experimentPrefix: CONFIG.experimentPrefix,
        maxConcurrency: CONFIG.maxConcurrency,
        client,
      })

      console.log('')
      console.log('✅ Experiment complete!')
      console.log('   View results at: https://smith.langchain.com')

      return results
    } else {
      // Local evaluation
      console.log('📋 Running local evaluation...')
      console.log('')

      const results: Array<{
        id: string
        scores: Record<string, number>
        passed: boolean
      }> = []

      for (const example of LOOP_CREATOR_DATASET.examples) {
        console.log(`Testing: ${example.id} - ${example.metadata?.description || ''}`)

        const output = await loopCreatorTarget(example.input)

        const scores: Record<string, number> = {}
        for (const evalWrapper of evaluators) {
          const mockRun = { outputs: output, inputs: example.input } as Run
          const mockExample = { inputs: example.input, outputs: example.expected }
          const evalResult = await evalWrapper.evaluator(mockRun, mockExample)
          const score = typeof evalResult.score === 'number' ? evalResult.score : (evalResult.score ? 1 : 0)
          scores[evalResult.key] = score
        }

        const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
        const passed = avgScore >= 0.5

        results.push({ id: example.id, scores, passed })
        console.log(`  ${passed ? '✅' : '❌'} Score: ${(avgScore * 100).toFixed(1)}%`)
      }

      console.log('')
      console.log('============================================')
      console.log('📊 Summary')
      console.log('============================================')

      const passedCount = results.filter((r) => r.passed).length
      console.log(`Passed: ${passedCount}/${results.length}`)

      return results
    }
  } catch (error) {
    console.error('❌ Experiment failed:', error)
    throw error
  }
}

// Run if executed directly
if (require.main === module) {
  runLoopCreatorExperiment()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}

