/**
 * Evaluation Runner V2
 *
 * Orchestrates evaluation runs with full Langfuse integration.
 * Supports:
 * - Dataset-based evaluation
 * - Single-item evaluation
 * - Batch evaluation with parallelism
 * - Score aggregation and reporting
 */

import { langfuse } from '@/agent-core/observability'
import {
  Judge,
  JudgeOutput,
  EvaluationItem,
  EvaluationResult,
  StorytellerContext,
  ScoreName,
  ScoreNames,
} from './types'

// Import all judges
import { MagicScoreJudge, EmotionalResonanceJudge, MemorableMomentsJudge } from './judges/magic-score-judge'
import { AntiSlopJudge, AuthenticityJudge, ClicheJudge } from './judges/anti-slop-judge'
import { StoryConsistencyJudge, CharacterVoiceJudge, WorldLogicJudge, CompositeConsistencyJudge } from './judges/consistency-judge'

export interface RunnerConfig {
  /** Name of the evaluation run */
  name: string
  /** Dataset name for grouping */
  datasetName?: string
  /** Whether to run judges in parallel */
  parallel?: boolean
  /** Maximum parallelism */
  maxParallel?: number
  /** Whether to fail fast on first error */
  failFast?: boolean
  /** Minimum passing score */
  minPassingScore?: number
  /** Tags for filtering in Langfuse */
  tags?: string[]
}

export interface RunnerResult {
  runId: string
  name: string
  startTime: Date
  endTime: Date
  durationMs: number
  items: EvaluationResult[]
  summary: {
    total: number
    passed: number
    failed: number
    passRate: number
    avgScores: Record<string, number>
    scoreRanges: Record<string, { min: number; max: number; avg: number }>
  }
}

/**
 * Create the standard storyteller judge suite
 */
export function createStorytellerJudges(config?: { model?: string }): Judge[] {
  const baseConfig = { model: config?.model || 'gpt-4o' }

  return [
    // Magic & Beauty
    new MagicScoreJudge(baseConfig),
    new EmotionalResonanceJudge(baseConfig),
    new MemorableMomentsJudge(baseConfig),

    // Anti-Slop
    new AntiSlopJudge(baseConfig),
    new AuthenticityJudge(baseConfig),

    // Consistency
    new CompositeConsistencyJudge(baseConfig),
  ]
}

/**
 * Create a minimal judge suite for quick checks
 */
export function createQuickJudges(config?: { model?: string }): Judge[] {
  const baseConfig = { model: config?.model || 'gpt-4o-mini' }

  return [
    new MagicScoreJudge(baseConfig),
    new AntiSlopJudge(baseConfig),
    new StoryConsistencyJudge(baseConfig),
  ]
}

/**
 * Create specialized judge suite for specific needs
 */
export function createSpecializedJudges(
  focus: 'magic' | 'slop' | 'consistency' | 'all',
  config?: { model?: string }
): Judge[] {
  const baseConfig = { model: config?.model || 'gpt-4o' }

  switch (focus) {
    case 'magic':
      return [
        new MagicScoreJudge(baseConfig),
        new EmotionalResonanceJudge(baseConfig),
        new MemorableMomentsJudge(baseConfig),
      ]
    case 'slop':
      return [
        new AntiSlopJudge(baseConfig),
        new AuthenticityJudge(baseConfig),
        new ClicheJudge(baseConfig),
      ]
    case 'consistency':
      return [
        new StoryConsistencyJudge(baseConfig),
        new CharacterVoiceJudge(baseConfig),
        new WorldLogicJudge(baseConfig),
      ]
    default:
      return createStorytellerJudges(config)
  }
}

export class EvaluationRunnerV2 {
  private judges: Judge[]
  private config: RunnerConfig

  constructor(judges: Judge[], config: RunnerConfig) {
    this.judges = judges
    this.config = {
      parallel: true,
      maxParallel: 5,
      failFast: false,
      minPassingScore: 0.6,
      ...config,
    }
  }

  /**
   * Run evaluation on a single item
   */
  async evaluateOne(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): Promise<Record<ScoreName, JudgeOutput>> {
    const results: Record<string, JudgeOutput> = {}

    if (this.config.parallel) {
      const judgeResults = await Promise.all(
        this.judges.map(judge => judge.evaluate(input, output, context, expected))
      )

      judgeResults.forEach((result, i) => {
        results[this.judges[i].scoreName] = result
      })
    } else {
      for (const judge of this.judges) {
        results[judge.scoreName] = await judge.evaluate(input, output, context, expected)
      }
    }

    return results as Record<ScoreName, JudgeOutput>
  }

  /**
   * Run evaluation on a dataset
   */
  async run(
    items: EvaluationItem[],
    subject: (input: string, context?: StorytellerContext) => Promise<string>
  ): Promise<RunnerResult> {
    const runId = `eval-${this.config.name}-${Date.now()}`
    const startTime = new Date()

    // Create top-level trace for the run
    const runTrace = langfuse.trace({
      id: runId,
      name: `Evaluation Run: ${this.config.name}`,
      metadata: {
        datasetName: this.config.datasetName,
        itemCount: items.length,
        judges: this.judges.map(j => j.name),
      },
      tags: this.config.tags,
    })

    const results: EvaluationResult[] = []

    // Process items (with optional parallelism)
    if (this.config.parallel && this.config.maxParallel && this.config.maxParallel > 1) {
      // Batch processing
      const batches = this.chunkArray(items, this.config.maxParallel)

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(item => this.evaluateItem(item, subject, runId))
        )
        results.push(...batchResults)

        if (this.config.failFast && batchResults.some(r => r.error)) {
          break
        }
      }
    } else {
      // Sequential processing
      for (const item of items) {
        const result = await this.evaluateItem(item, subject, runId)
        results.push(result)

        if (this.config.failFast && result.error) {
          break
        }
      }
    }

    const endTime = new Date()

    // Calculate summary
    const summary = this.calculateSummary(results)

    // Update run trace
    runTrace.update({
      output: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        passRate: summary.passRate,
        avgScores: summary.avgScores,
      },
    })

    // Record aggregate scores
    for (const [scoreName, stats] of Object.entries(summary.scoreRanges)) {
      runTrace.score({
        name: `avg_${scoreName}`,
        value: stats.avg,
        comment: `Range: ${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}`,
      })
    }

    await langfuse.flush()

    return {
      runId,
      name: this.config.name,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      items: results,
      summary,
    }
  }

  /**
   * Evaluate a single item from the dataset
   */
  private async evaluateItem(
    item: EvaluationItem,
    subject: (input: string, context?: StorytellerContext) => Promise<string>,
    runId: string
  ): Promise<EvaluationResult> {
    const itemTraceId = `${runId}-item-${item.id}`

    const itemTrace = langfuse.trace({
      id: itemTraceId,
      name: `Item: ${item.id}`,
      parentObservationId: runId,
      input: { input: item.input.slice(0, 500), context: item.context },
      metadata: item.metadata,
    })

    try {
      // Generate output using subject
      const subjectSpan = itemTrace.span({
        name: 'subject-generation',
        input: item.input,
      })

      const output = await subject(item.input, item.context)

      subjectSpan.end({ output: output.slice(0, 500) })

      // Run judges
      const judgeResults = await this.evaluateOne(
        item.input,
        output,
        item.context,
        item.expectedOutput
      )

      // Record scores
      const scores: Record<string, number> = {}
      const details: Record<string, any> = {}

      for (const [scoreName, result] of Object.entries(judgeResults)) {
        scores[scoreName] = result.score
        details[scoreName] = result.details

        itemTrace.score({
          name: scoreName,
          value: result.score,
          comment: result.reasoning.slice(0, 500),
        })
      }

      // Determine pass/fail
      const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
      const passed = avgScore >= (this.config.minPassingScore || 0.6)

      itemTrace.update({
        output: { avgScore, passed, scores },
      })

      return {
        itemId: item.id,
        scores: scores as Record<ScoreName, number>,
        details: details as Record<ScoreName, any>,
        passed,
      }
    } catch (error: any) {
      console.error(`[EvaluationRunner] Error processing item ${item.id}:`, error)

      itemTrace.update({
        output: { error: error.message },
        metadata: { error: true, ...item.metadata },
      })

      return {
        itemId: item.id,
        scores: {} as Record<ScoreName, number>,
        details: {} as Record<ScoreName, any>,
        passed: false,
        error: error.message,
      }
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: EvaluationResult[]): RunnerResult['summary'] {
    const total = results.length
    const passed = results.filter(r => r.passed).length
    const failed = total - passed

    // Aggregate scores
    const allScores: Record<string, number[]> = {}

    for (const result of results) {
      if (result.scores) {
        for (const [scoreName, score] of Object.entries(result.scores)) {
          if (!allScores[scoreName]) allScores[scoreName] = []
          allScores[scoreName].push(score)
        }
      }
    }

    const avgScores: Record<string, number> = {}
    const scoreRanges: Record<string, { min: number; max: number; avg: number }> = {}

    for (const [scoreName, scores] of Object.entries(allScores)) {
      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0)
        const avg = sum / scores.length
        avgScores[scoreName] = avg
        scoreRanges[scoreName] = {
          min: Math.min(...scores),
          max: Math.max(...scores),
          avg,
        }
      }
    }

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 0,
      avgScores,
      scoreRanges,
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Quick evaluation helper
 */
export async function quickEvaluate(
  output: string,
  context?: StorytellerContext,
  judges: 'full' | 'quick' | Judge[] = 'quick'
): Promise<{
  magic: number
  slop: number
  consistency: number
  overall: number
  details: Record<string, any>
}> {
  const judgeList = Array.isArray(judges)
    ? judges
    : judges === 'full'
      ? createStorytellerJudges()
      : createQuickJudges()

  const runner = new EvaluationRunnerV2(judgeList, { name: 'quick-eval' })

  const results = await runner.evaluateOne('', output, context)

  // Extract key scores
  const magic = results[ScoreNames.MAGIC_SCORE]?.score || 0
  const slop = results[ScoreNames.ANTI_SLOP]?.score || 0
  const consistency = results[ScoreNames.STORY_CONSISTENCY]?.score || 0

  const overall = (magic + slop + consistency) / 3

  const details: Record<string, any> = {}
  for (const [key, value] of Object.entries(results)) {
    details[key] = value.details
  }

  return { magic, slop, consistency, overall, details }
}
