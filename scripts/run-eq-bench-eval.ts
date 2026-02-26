#!/usr/bin/env npx tsx
/**
 * EQ-Bench Evaluation Runner
 *
 * Run EQ-Bench style evaluations and send results to Langfuse.
 * Based on arxiv.org/html/2312.06281v2 methodology.
 *
 * Usage:
 *   npx tsx scripts/run-eq-bench-eval.ts [options]
 *
 * Options:
 *   --dataset <path>   Path to dataset JSON file
 *   --sample <n>       Number of samples to evaluate (default: all)
 *   --model <name>     Model to use (default: gpt-4o)
 *   --push-prompts     Push prompts to Langfuse before running
 *   --quick            Use quick evaluation (fewer judges)
 */

import { langfuse } from '../src/agent-core/observability'
import { getEQBenchEvaluator, runLangfuseExperiment } from '../src/evaluation/langfuse/eq-bench-evaluator'
import { pushPromptsToLangfuse } from '../src/prompts/langfuse-sync'
import { STORYTELLER_PROMPTS } from '../src/prompts/storyteller-prompts'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// =============================================================================
// TYPES
// =============================================================================

interface EvalDatasetItem {
  id: string
  content: string
  context?: string
  canon?: string
  metadata?: Record<string, any>
  expectedScores?: {
    emotion?: number
    magic?: number
    consistency?: number
  }
}

interface EvalResult {
  itemId: string
  scores: {
    emotion: number
    magic: number
    consistency?: number
    composite: number
  }
  passed: boolean
  duration: number
  details?: any
}

interface EvalRunResult {
  runId: string
  name: string
  timestamp: string
  model: string
  itemCount: number
  results: EvalResult[]
  summary: {
    avgEmotion: number
    avgMagic: number
    avgConsistency?: number
    avgComposite: number
    passRate: number
    duration: number
  }
}

// =============================================================================
// SAMPLE DATASET
// =============================================================================

const SAMPLE_DATASET: EvalDatasetItem[] = [
  {
    id: 'sample-1',
    content: `INT. ABANDONED WAREHOUSE - NIGHT

The rain hammers against broken windows. MARCUS (40s, weathered) stands
in a pool of lamplight, holding a crumpled photograph.

ELENA (O.S.)
You kept it. All these years.

He doesn't turn. His thumb traces the face in the photo.

MARCUS
She would have been twenty-three today.

Elena emerges from the shadows, her footsteps echoing.

ELENA
Marcus—

MARCUS
Don't. I know what you're going to say.
That it wasn't my fault. That I couldn't
have known.

He finally looks at her. His eyes are dry, but something in them
has fractured.

MARCUS (CONT'D)
But I did know. I knew, and I did nothing.

The photograph slips from his fingers, landing face-down in a puddle.
Neither of them moves to pick it up.`,
    context: 'A noir thriller exploring guilt and redemption.',
    metadata: { genre: 'noir', theme: 'guilt' },
  },
  {
    id: 'sample-2',
    content: `The market was alive with color and noise. Stalls overflowed with spices
that painted the air in shades of turmeric and cardamom. Maria walked through
the crowd, her fingers trailing across bolts of silk.

She was looking for something. She didn't know what yet, but she would
recognize it when she saw it. Her grandmother had told her that—the best
finds weren't searched for, they revealed themselves.

A flash of blue caught her eye. Not the bright tourist-trap blue of cheap
ceramics, but something deeper. The blue of deep water at twilight.

The stall owner, an ancient woman with eyes like coffee beans, smiled
without showing teeth.

"You see it," the woman said. Not a question.

Maria's hand closed around the pendant without her permission. It was
warm against her palm, warmer than the summer day could account for.

"What is it?" she whispered.

"The question isn't what." The woman's gnarled fingers wrapped around
Maria's wrist. "The question is why it called to you."`,
    context: 'A magical realism story about discovery and fate.',
    metadata: { genre: 'magical-realism', theme: 'discovery' },
  },
  {
    id: 'sample-3',
    content: `Commander Reyes checked her suit seals for the third time. Outside the
viewport, the alien structure pulsed with bioluminescent patterns that
their xenolinguist insisted were a form of communication.

"It's beautiful," whispered Dr. Chen.

"It's dangerous," Reyes corrected. "We don't know what it wants."

"Maybe it doesn't want anything. Maybe it just... is."

Reyes turned to face her science officer. Chen was young, barely past
her thesis defense, eyes full of that wonder that Academy training
was supposed to drum out of you.

"In my experience," Reyes said carefully, "everything wants something."

A new pattern rippled across the structure's surface. Chen's translator
beeped urgently.

"Commander." Chen's voice had changed. "It's not communicating with us."

"Then what—"

"It's... singing. It's just singing to itself."

Reyes looked at the structure again. The patterns were spiraling now,
fractals within fractals. For a moment—just a moment—she let herself
wonder if Chen was right.

Maybe not everything was a threat. Maybe some things really were just
beautiful.`,
    context: 'A first-contact science fiction story.',
    metadata: { genre: 'sci-fi', theme: 'wonder' },
  },
]

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const datasetPath = getArg(args, '--dataset')
  const sampleCount = parseInt(getArg(args, '--sample') || '0', 10)
  const model = getArg(args, '--model') || 'gpt-4o'
  const pushPrompts = args.includes('--push-prompts')
  const quick = args.includes('--quick')
  const useExperiment = args.includes('--experiment')
  const experimentName = getArg(args, '--name') || `eq-bench-${Date.now()}`

  console.log('='.repeat(60))
  console.log('EQ-Bench Evaluation Runner (Langfuse Integration)')
  console.log('='.repeat(60))
  console.log(`Model: ${model}`)
  console.log(`Mode: ${quick ? 'Quick' : 'Full'}`)
  console.log(`Langfuse Experiment API: ${useExperiment ? 'YES (shows in Evals tab)' : 'NO (trace only)'}`)
  console.log()

  // Push prompts if requested
  if (pushPrompts) {
    console.log('Pushing prompts to Langfuse...')
    const syncResult = await pushPromptsToLangfuse(STORYTELLER_PROMPTS)
    console.log(`  Pushed: ${syncResult.pushed.length}`)
    console.log(`  Skipped: ${syncResult.skipped.length}`)
    console.log(`  Errors: ${syncResult.errors.length}`)
    console.log()
  }

  // Load dataset
  let dataset: EvalDatasetItem[]
  if (datasetPath) {
    console.log(`Loading dataset from ${datasetPath}...`)
    const raw = readFileSync(datasetPath, 'utf-8')
    dataset = JSON.parse(raw)
  } else {
    console.log('Using sample dataset...')
    dataset = SAMPLE_DATASET
  }

  // Apply sample limit
  if (sampleCount > 0 && sampleCount < dataset.length) {
    dataset = dataset.slice(0, sampleCount)
  }

  console.log(`Evaluating ${dataset.length} items...`)
  console.log()

  // =========================================================================
  // EXPERIMENT MODE (shows in Langfuse Evals tab)
  // =========================================================================
  if (useExperiment) {
    console.log(`Running as Langfuse Experiment: ${experimentName}`)
    console.log()

    // Convert dataset to experiment format
    const experimentData = dataset.map(item => ({
      input: item.context || 'Evaluate this content',
      output: item.content,
      expectedOutput: undefined,
    }))

    try {
      const result = await runLangfuseExperiment(experimentName, experimentData, { model })

      console.log()
      console.log('='.repeat(60))
      console.log('EXPERIMENT COMPLETE')
      console.log('='.repeat(60))
      console.log(`Experiment: ${experimentName}`)
      console.log()
      console.log('View results in Langfuse Evals tab:')
      console.log(`  ${process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'}/project/*/evals`)

      await langfuse.flush()
      return
    } catch (error: any) {
      console.error('Experiment failed:', error.message)
      console.log('Falling back to trace-based evaluation...')
      console.log()
    }
  }

  // =========================================================================
  // TRACE MODE (regular evaluation with traces)
  // =========================================================================

  // Create evaluator
  const evaluator = getEQBenchEvaluator({
    model,
    useLangfusePrompts: pushPrompts, // Only use Langfuse prompts if we pushed them
  })

  // Run evaluation
  const runId = `eq-bench-${Date.now()}`
  const startTime = Date.now()
  const results: EvalResult[] = []

  // Create run trace in Langfuse
  const runTrace = langfuse.trace({
    id: runId,
    name: `EQ-Bench Evaluation: ${dataset.length} items`,
    metadata: {
      model,
      mode: quick ? 'quick' : 'full',
      datasetSource: datasetPath || 'sample',
    },
  })

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i]
    const itemStart = Date.now()

    console.log(`[${i + 1}/${dataset.length}] Evaluating: ${item.id}`)

    try {
      const evalResult = await evaluator.evaluateFull(item.content, {
        context: item.context,
        canon: item.canon,
        traceId: `${runId}-${item.id}`,
      })

      const result: EvalResult = {
        itemId: item.id,
        scores: {
          emotion: evalResult.emotion.score,
          magic: evalResult.magic.score,
          consistency: evalResult.consistency?.score,
          composite: evalResult.composite,
        },
        passed: evalResult.composite >= 0.6,
        duration: Date.now() - itemStart,
        details: {
          sparks: evalResult.magic.output.sparks.length,
          slop: evalResult.magic.output.slop.length,
        },
      }

      results.push(result)

      console.log(`  Emotion: ${(result.scores.emotion * 100).toFixed(1)}%`)
      console.log(`  Magic: ${(result.scores.magic * 100).toFixed(1)}%`)
      if (result.scores.consistency !== undefined) {
        console.log(`  Consistency: ${(result.scores.consistency * 100).toFixed(1)}%`)
      }
      console.log(`  Composite: ${(result.scores.composite * 100).toFixed(1)}%`)
      console.log(`  Status: ${result.passed ? 'PASS' : 'FAIL'}`)
      console.log()
    } catch (error: any) {
      console.error(`  Error: ${error.message}`)
      results.push({
        itemId: item.id,
        scores: { emotion: 0, magic: 0, composite: 0 },
        passed: false,
        duration: Date.now() - itemStart,
      })
    }
  }

  // Calculate summary
  const totalDuration = Date.now() - startTime
  const validResults = results.filter(r => r.scores.composite > 0)

  const summary = {
    avgEmotion: average(validResults.map(r => r.scores.emotion)),
    avgMagic: average(validResults.map(r => r.scores.magic)),
    avgConsistency: validResults.some(r => r.scores.consistency !== undefined)
      ? average(validResults.filter(r => r.scores.consistency !== undefined).map(r => r.scores.consistency!))
      : undefined,
    avgComposite: average(validResults.map(r => r.scores.composite)),
    passRate: validResults.length > 0 ? validResults.filter(r => r.passed).length / validResults.length : 0,
    duration: totalDuration,
  }

  // Record summary in Langfuse
  runTrace.score({ name: 'avg_emotion', value: summary.avgEmotion })
  runTrace.score({ name: 'avg_magic', value: summary.avgMagic })
  if (summary.avgConsistency !== undefined) {
    runTrace.score({ name: 'avg_consistency', value: summary.avgConsistency })
  }
  runTrace.score({ name: 'avg_composite', value: summary.avgComposite })
  runTrace.score({ name: 'pass_rate', value: summary.passRate })

  runTrace.update({
    output: { summary },
  })

  await langfuse.flush()

  // Print summary
  console.log('='.repeat(60))
  console.log('EVALUATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Run ID: ${runId}`)
  console.log(`Items Evaluated: ${validResults.length}/${dataset.length}`)
  console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log()
  console.log('Average Scores:')
  console.log(`  Emotion:     ${(summary.avgEmotion * 100).toFixed(1)}%`)
  console.log(`  Magic:       ${(summary.avgMagic * 100).toFixed(1)}%`)
  if (summary.avgConsistency !== undefined) {
    console.log(`  Consistency: ${(summary.avgConsistency * 100).toFixed(1)}%`)
  }
  console.log(`  Composite:   ${(summary.avgComposite * 100).toFixed(1)}%`)
  console.log()
  console.log(`Pass Rate: ${(summary.passRate * 100).toFixed(1)}%`)
  console.log()
  console.log('View results in Langfuse:')
  console.log(`  ${process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'}/trace/${runId}`)

  // Ensure results directory exists
  const resultsDir = join(process.cwd(), 'src/evaluation/results')
  try {
    mkdirSync(resultsDir, { recursive: true })
  } catch {
    // Directory exists
  }

  // Save results
  const outputPath = join(resultsDir, `${runId}.json`)
  const runResult: EvalRunResult = {
    runId,
    name: 'EQ-Bench Evaluation',
    timestamp: new Date().toISOString(),
    model,
    itemCount: dataset.length,
    results,
    summary,
  }

  writeFileSync(outputPath, JSON.stringify(runResult, null, 2))
  console.log(`Results saved to: ${outputPath}`)
}

// =============================================================================
// HELPERS
// =============================================================================

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index !== -1 && index < args.length - 1) {
    return args[index + 1]
  }
  return undefined
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

// Run
main().catch(console.error)
