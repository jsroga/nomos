/**
 * Storyteller Experiment Runner
 *
 * Runs evaluation experiments on the storyteller agent using LangSmith.
 *
 * Usage: npm run eval:storyteller
 */

import { Client, Run } from 'langsmith'
import { evaluate } from 'langsmith/evaluation'
import { STORYTELLER_DATASET } from '../datasets/storyteller-golden'
import { ragGroundingEvaluator, ragGroundingHeuristic } from '../evaluators/rag-grounding'
import { consistencyEvaluator, consistencyHeuristic } from '../evaluators/consistency'
import { hallucinationDetector, hallucinationHeuristic } from '../evaluators/hallucination'
import { agentRoutingEvaluator, haltingBehaviorEvaluator } from '../evaluators/agent-routing'
import { scriptQualityEvaluator, scriptFormatEvaluator } from '../evaluators/script-quality'
import { CustomEvaluator, EvaluatorInput } from '../types'

// Configuration
const CONFIG = {
  datasetName: STORYTELLER_DATASET.name,
  experimentPrefix: 'storyteller-eval',
  maxConcurrency: 4,
  useLLMEvaluators: process.env.USE_LLM_EVALUATORS !== 'false',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api/storyteller/chat/stream',
  testProjectId: process.env.TEST_PROJECT_ID || '01c5deda-c654-4576-89f9-860ff545f2dd',
  testEpisodeId: process.env.TEST_EPISODE_ID || 'f8722286-25b7-4d83-bd85-6cbac61be361',
}

/**
 * Target function: Calls the storyteller API
 */
async function storytellerTarget(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const message = input.message as string

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        projectId: CONFIG.testProjectId,
        episodeId: CONFIG.testEpisodeId,
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

    // Parse delegated agents from response
    const delegatedAgents: string[] = []
    const agentPatterns = [
      /delegating to (\w+)/gi,
      /(\w+Architect)/gi,
      /(Writer|ScriptEditor|Showrunner)/gi,
    ]

    for (const pattern of agentPatterns) {
      let match
      while ((match = pattern.exec(fullResponse)) !== null) {
        if (match[1]) delegatedAgents.push(match[1])
      }
    }

    return {
      response: fullResponse,
      delegatedAgents: Array.from(new Set(delegatedAgents)),
      awaitingInput: /awaiting[_\s]*(user[_\s]*)?input/i.test(fullResponse),
    }
  } catch (error) {
    return {
      response: '',
      error: error instanceof Error ? error.message : String(error),
      awaitingInput: false,
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
 * Run the storyteller experiment
 */
export async function runStorytellerExperiment() {
  console.log('🚀 Starting Storyteller Evaluation Experiment')
  console.log('============================================')
  console.log(`Dataset: ${CONFIG.datasetName}`)
  console.log(`API URL: ${CONFIG.apiUrl}`)
  console.log(`Use LLM Evaluators: ${CONFIG.useLLMEvaluators}`)
  console.log('')

  // Check environment
  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ LANGCHAIN_API_KEY is not set')
    process.exit(1)
  }

  const client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  // Select evaluators based on config
  const evaluators = CONFIG.useLLMEvaluators
    ? [
        wrapEvaluator(ragGroundingEvaluator),
        wrapEvaluator(consistencyEvaluator),
        wrapEvaluator(hallucinationDetector),
        wrapEvaluator(agentRoutingEvaluator),
        wrapEvaluator(scriptQualityEvaluator),
      ]
    : [
        wrapEvaluator(ragGroundingHeuristic),
        wrapEvaluator(consistencyHeuristic),
        wrapEvaluator(hallucinationHeuristic),
        wrapEvaluator(haltingBehaviorEvaluator),
        wrapEvaluator(scriptFormatEvaluator),
      ]

  console.log(`📊 Using ${evaluators.length} evaluators`)
  console.log('')

  try {
    // Check if dataset exists
    let datasetExists = false
    try {
      await client.readDataset({ datasetName: CONFIG.datasetName })
      datasetExists = true
    } catch {
      console.log(`⚠️  Dataset '${CONFIG.datasetName}' not found in LangSmith`)
      console.log('   Run: npm run eval:upload-datasets first')
      console.log('')
      console.log('Running local evaluation instead...')
    }

    if (datasetExists) {
      // Run with LangSmith
      const results = await evaluate(storytellerTarget, {
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
      // Run locally with dataset examples
      console.log('📋 Running local evaluation with dataset examples...')
      console.log('')

      const results: Array<{
        id: string
        scores: Record<string, number>
        passed: boolean
      }> = []

      for (const example of STORYTELLER_DATASET.examples) {
        console.log(`Testing: ${example.id} - ${example.metadata?.description || ''}`)

        const output = await storytellerTarget(example.input)

        const scores: Record<string, number> = {}
        for (const evalWrapper of evaluators) {
          const mockRun = { outputs: output, inputs: example.input } as Run
          const mockExample = { inputs: example.input, outputs: example.expected }
          const evalResult = await evalWrapper.evaluator(mockRun, mockExample)
          const score =
            typeof evalResult.score === 'number' ? evalResult.score : evalResult.score ? 1 : 0
          scores[evalResult.key] = score
        }

        const avgScore =
          Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
        const passed = avgScore >= 0.5

        results.push({
          id: example.id,
          scores,
          passed,
        })

        console.log(`  ${passed ? '✅' : '❌'} Score: ${(avgScore * 100).toFixed(1)}%`)
      }

      console.log('')
      console.log('============================================')
      console.log('📊 Summary')
      console.log('============================================')

      const passedCount = results.filter(r => r.passed).length
      console.log(`Passed: ${passedCount}/${results.length}`)

      // Aggregate scores by evaluator
      const aggregated: Record<string, number[]> = {}
      for (const result of results) {
        for (const [key, score] of Object.entries(result.scores)) {
          if (!aggregated[key]) aggregated[key] = []
          aggregated[key].push(score)
        }
      }

      console.log('')
      console.log('Average Scores by Evaluator:')
      for (const [key, scores] of Object.entries(aggregated)) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        console.log(`  ${key}: ${(avg * 100).toFixed(1)}%`)
      }

      return results
    }
  } catch (error) {
    console.error('❌ Experiment failed:', error)
    throw error
  }
}

// Run if executed directly
if (require.main === module) {
  runStorytellerExperiment()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}
