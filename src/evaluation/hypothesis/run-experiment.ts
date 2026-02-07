#!/usr/bin/env npx tsx
/**
 * Hypothesis Experiment Runner
 * 
 * CLI entry point for running hypothesis-driven evaluations.
 * 
 * Usage:
 *   npx tsx src/evaluation/hypothesis/run-experiment.ts --config experiments/hyp-001.json
 *   npx tsx src/evaluation/hypothesis/run-experiment.ts --config experiments/hyp-001.json --baseline-only
 *   npm run eval hypothesis -- --config experiments/hyp-001.json
 */

// Load environment variables first
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import * as fs from 'fs/promises'
import * as path from 'path'
import { langfuse } from '@/agent-core/observability'
import { ExperimentConfig, ConversationTurn, OutputScope } from './types'
import { runSimulation, runABSimulation, simulationToTestCase } from './conversation-simulator'
import { serializeOutputsForEvaluation } from './output-capture'
import { runDeepEval, checkDeepEvalSetup } from '../deepeval'
import { DeepEvalInput, DeepEvalOutput } from '../deepeval/types'
import {
  generateReport,
  renderReportAsMarkdown,
  saveReport,
  calculateMetricComparisons,
  determineVerdict,
} from './recommendation-generator'
import {
  getConfidentAIClient,
  getTestRunUrl,
  LLMTestCase as ConfidentTestCase,
} from '../confident-ai/client'

// ============================================
// Configuration
// ============================================

interface RunOptions {
  /** Path to experiment config file */
  configPath?: string
  /** Inline experiment config */
  config?: ExperimentConfig
  /** Run baseline only (no A/B comparison) */
  baselineOnly?: boolean
  /** Specific metrics to run */
  metrics?: string[]
  /** Skip simulation, use provided outputs */
  skipSimulation?: boolean
  /** Verbose output */
  verbose?: boolean
  /** Output directory for reports */
  outputDir?: string
  /** Push results to Confident AI dashboard */
  pushToConfidentAI?: boolean
}

// ============================================
// Experiment Loading
// ============================================

/**
 * Load experiment config from JSON file
 */
async function loadExperimentConfig(configPath: string): Promise<ExperimentConfig> {
  const absolutePath = path.isAbsolute(configPath) 
    ? configPath 
    : path.join(process.cwd(), configPath)
  
  const content = await fs.readFile(absolutePath, 'utf-8')
  return JSON.parse(content) as ExperimentConfig
}

// ============================================
// Main Experiment Runner
// ============================================

/**
 * Run a full hypothesis experiment
 */
export async function runHypothesisExperiment(options: RunOptions): Promise<{
  success: boolean
  reportPath?: string
  summary?: string
  error?: string
  confidentAIUrl?: string
}> {
  const {
    configPath,
    config: inlineConfig,
    baselineOnly = false,
    metrics,
    skipSimulation = false,
    verbose = true,
    outputDir,
    pushToConfidentAI = false,
  } = options

  // Load config
  let config: ExperimentConfig
  if (inlineConfig) {
    config = inlineConfig
  } else if (configPath) {
    config = await loadExperimentConfig(configPath)
  } else {
    return { success: false, error: 'No config provided. Use --config or provide inline config.' }
  }

  const { hypothesis, messageFlow, outputScope } = config

  if (verbose) {
    console.log(`\n═══════════════════════════════════════════════════════════`)
    console.log(`  🧪 Hypothesis Experiment: ${hypothesis.name}`)
    console.log(`═══════════════════════════════════════════════════════════`)
    console.log(`  ID: ${hypothesis.id}`)
    console.log(`  Variable Type: ${hypothesis.variable.type}`)
    console.log(`  Target Metrics: ${hypothesis.targetMetrics.join(', ') || 'All'}`)
    console.log(`  Message Flow: ${messageFlow.length} turns`)
    console.log(`  Output Scope: ${outputScope.join(', ')}`)
    console.log(`═══════════════════════════════════════════════════════════\n`)
  }

  // Check DeepEval setup
  if (verbose) {
    console.log(`🔧 Checking DeepEval setup...`)
  }
  const setupCheck = await checkDeepEvalSetup()
  if (!setupCheck.ready) {
    console.error(`❌ DeepEval not ready: ${setupCheck.error}`)
    console.error(`\nRun the following to set up DeepEval:`)
    console.error(`  cd scripts/deepeval`)
    console.error(`  python3 -m venv venv`)
    console.error(`  source venv/bin/activate`)
    console.error(`  pip install -r requirements.txt`)
    return { success: false, error: setupCheck.error }
  }
  if (verbose) {
    console.log(`✅ DeepEval ready\n`)
  }

  try {
    if (baselineOnly) {
      // Run baseline only
      if (verbose) {
        console.log(`📊 Running BASELINE simulation...`)
      }

      const simulation = await runSimulation(
        hypothesis,
        messageFlow,
        outputScope,
        'baseline',
        { verbose, ...config }
      )

      // Convert to test case
      const testCase = simulationToTestCase(simulation, outputScope)

      // Run evaluation
      if (verbose) {
        console.log(`\n📊 Running DeepEval metrics...`)
      }

      const evalInput: DeepEvalInput = {
        testCases: [{
          input: testCase.input,
          actualOutput: testCase.actualOutput,
          context: testCase.context,
        }],
        metrics: metrics || hypothesis.targetMetrics,
      }

      const evalResult = await runDeepEval(evalInput)

      if (!evalResult.success) {
        return { success: false, error: evalResult.error }
      }

      // Print results
      if (verbose) {
        console.log(`\n═══════════════════════════════════════════════════════════`)
        console.log(`  📊 BASELINE RESULTS`)
        console.log(`═══════════════════════════════════════════════════════════`)
        for (const tc of evalResult.testCases) {
          for (const m of tc.metrics) {
            const icon = m.success ? '✅' : '❌'
            console.log(`  ${icon} ${m.name}: ${m.score.toFixed(2)}`)
          }
        }
        console.log(`═══════════════════════════════════════════════════════════\n`)
      }

      return {
        success: true,
        summary: `Baseline evaluation complete. ${evalResult.testCases.length} test cases evaluated.`,
      }

    } else {
      // Run full A/B experiment
      if (verbose) {
        console.log(`📊 Running A/B simulation...`)
      }

      const { baseline, variant } = await runABSimulation(
        hypothesis,
        messageFlow,
        outputScope,
        { verbose, ...config }
      )

      // Convert to test cases
      const baselineTestCase = simulationToTestCase(baseline, outputScope)
      const variantTestCase = simulationToTestCase(variant, outputScope)

      // Run evaluations
      if (verbose) {
        console.log(`\n📊 Running DeepEval on BASELINE...`)
      }

      const baselineEval = await runDeepEval({
        testCases: [{
          input: baselineTestCase.input,
          actualOutput: baselineTestCase.actualOutput,
          context: baselineTestCase.context,
        }],
        metrics: metrics || hypothesis.targetMetrics,
      })

      if (verbose) {
        console.log(`📊 Running DeepEval on VARIANT...`)
      }

      const variantEval = await runDeepEval({
        testCases: [{
          input: variantTestCase.input,
          actualOutput: variantTestCase.actualOutput,
          context: variantTestCase.context,
        }],
        metrics: metrics || hypothesis.targetMetrics,
      })

      if (!baselineEval.success || !variantEval.success) {
        return {
          success: false,
          error: `Evaluation failed: ${baselineEval.error || variantEval.error}`,
        }
      }

      // Generate report
      if (verbose) {
        console.log(`\n📝 Generating recommendation report...`)
      }

      const report = await generateReport(
        hypothesis,
        baseline,
        variant,
        baselineEval,
        variantEval
      )

      // Save report
      const reportPath = await saveReport(report, outputDir)

      // Print summary
      if (verbose) {
        const verdictEmoji = report.verdict === 'confirmed' ? '✅' : report.verdict === 'rejected' ? '❌' : '❓'
        
        console.log(`\n═══════════════════════════════════════════════════════════`)
        console.log(`  ${verdictEmoji} EXPERIMENT COMPLETE: ${report.verdict.toUpperCase()}`)
        console.log(`═══════════════════════════════════════════════════════════`)
        console.log(`\n  📊 Metric Comparisons:`)
        for (const m of report.metricsAnalysis) {
          const arrow = m.improved ? '↑' : m.delta < 0 ? '↓' : '→'
          const icon = m.significant ? (m.improved ? '✅' : '❌') : '➖'
          console.log(`    ${icon} ${m.metricName}: ${m.baselineScore.toFixed(2)} ${arrow} ${m.variantScore.toFixed(2)} (${m.deltaPercent > 0 ? '+' : ''}${m.deltaPercent.toFixed(1)}%)`)
        }
        
        console.log(`\n  📋 Summary:`)
        console.log(`    ${report.summary}`)
        
        if (report.recommendations.length > 0) {
          console.log(`\n  💡 Top Recommendations:`)
          for (const rec of report.recommendations.slice(0, 3)) {
            console.log(`    • [${rec.priority}] ${rec.recommendation}`)
          }
        }
        
        console.log(`\n  📄 Full Report: ${reportPath}`)
        console.log(`═══════════════════════════════════════════════════════════\n`)
      }

      // Push to Confident AI if requested
      let confidentAIUrl: string | undefined
      if (pushToConfidentAI) {
        try {
          if (verbose) {
            console.log(`\n☁️  Pushing results to Confident AI...`)
          }
          
          const client = getConfidentAIClient()
          
          // Prepare test cases for Confident AI
          const confidentTestCases: ConfidentTestCase[] = [
            {
              name: `${hypothesis.id}-baseline`,
              input: baselineTestCase.input.slice(0, 2000),
              actualOutput: baselineTestCase.actualOutput.slice(0, 10000),
              context: baselineTestCase.context,
            },
            {
              name: `${hypothesis.id}-variant`,
              input: variantTestCase.input.slice(0, 2000),
              actualOutput: variantTestCase.actualOutput.slice(0, 10000),
              context: variantTestCase.context,
            },
          ]

          // Push to Confident AI with hypothesis metadata
          const response = await client.evaluate({
            metricCollection: 'Storyteller Quick v3',
            llmTestCases: confidentTestCases,
            hyperparameters: {
              'Hypothesis ID': hypothesis.id,
              'Hypothesis Name': hypothesis.name,
              'Variable Type': hypothesis.variable.type,
              'Test Type': 'Hypothesis A/B',
              'Verdict': report.verdict,
              'Source': 'DeepEval Local',
            },
            identifier: `hypothesis-${hypothesis.id}-${Date.now()}`,
          })

          if (response.success) {
            confidentAIUrl = getTestRunUrl(response.data.id)
            if (verbose) {
              console.log(`✅ Pushed to Confident AI: ${confidentAIUrl}`)
            }
          }
        } catch (confidentError) {
          const errorMsg = confidentError instanceof Error ? confidentError.message : String(confidentError)
          if (verbose) {
            console.log(`⚠️  Failed to push to Confident AI: ${errorMsg}`)
            console.log(`   (Local evaluation results are still valid)`)
          }
        }
      }

      return {
        success: true,
        reportPath,
        summary: report.summary,
        confidentAIUrl,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`\n❌ Experiment failed: ${errorMessage}`)
    return { success: false, error: errorMessage }
  } finally {
    // Flush traces
    await langfuse.flush()
  }
}

// ============================================
// CLI Entry Point
// ============================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let configPath: string | undefined
  let baselineOnly = false
  let metrics: string[] | undefined
  let verbose = true
  let pushToConfidentAI = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--config' || arg === '-c') {
      configPath = args[++i]
    } else if (arg === '--baseline-only' || arg === '-b') {
      baselineOnly = true
    } else if (arg === '--metrics' || arg === '-m') {
      metrics = args[++i]?.split(',').map(m => m.trim())
    } else if (arg === '--quiet' || arg === '-q') {
      verbose = false
    } else if (arg === '--push-to-confident-ai' || arg === '--push' || arg === '-p') {
      pushToConfidentAI = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Hypothesis Experiment Runner

Usage:
  npx tsx src/evaluation/hypothesis/run-experiment.ts --config <path>

Options:
  --config, -c <path>        Path to experiment config JSON file
  --baseline-only, -b        Run baseline only (no A/B comparison)
  --metrics, -m <list>       Comma-separated list of metrics to run
  --push-to-confident-ai, -p Push results to Confident AI dashboard
  --quiet, -q                Suppress verbose output
  --help, -h                 Show this help message

Examples:
  npx tsx src/evaluation/hypothesis/run-experiment.ts --config experiments/hyp-001.json
  npx tsx src/evaluation/hypothesis/run-experiment.ts -c experiments/hyp-001.json --baseline-only
  npx tsx src/evaluation/hypothesis/run-experiment.ts -c experiments/hyp-001.json --push-to-confident-ai
  npx tsx src/evaluation/hypothesis/run-experiment.ts -c experiments/hyp-001.json -m "Anti-Slop Score,Mazur Character Voice"
`)
      process.exit(0)
    }
  }

  if (!configPath) {
    console.error('Error: --config is required')
    console.error('Run with --help for usage information')
    process.exit(1)
  }

  const result = await runHypothesisExperiment({
    configPath,
    baselineOnly,
    metrics,
    verbose,
    pushToConfidentAI,
  })

  if (!result.success) {
    console.error(`\n❌ Experiment failed: ${result.error}`)
    process.exit(1)
  }

  console.log(`\n✅ Experiment completed successfully`)
  if (result.reportPath) {
    console.log(`📄 Report saved to: ${result.reportPath}`)
  }
  if (result.confidentAIUrl) {
    console.log(`☁️  View on Confident AI: ${result.confidentAIUrl}`)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}
