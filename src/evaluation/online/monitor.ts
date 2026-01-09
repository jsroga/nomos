/**
 * Online Evaluation Monitor
 * 
 * Monitors production traces and evaluates a subset in near real-time.
 * Useful for:
 * - Detecting quality degradation
 * - Alerting on anomalies
 * - Continuous evaluation of live traffic
 */

import { Client, Run } from 'langsmith'
import { hallucinationHeuristic } from '../evaluators/hallucination'
import { consistencyHeuristic } from '../evaluators/consistency'
import { ragGroundingHeuristic } from '../evaluators/rag-grounding'
import { CustomEvaluator, EvaluatorInput } from '../types'

export interface OnlineEvaluationConfig {
  /** Project name in LangSmith */
  projectName: string
  /** How often to check for new runs (ms) */
  pollIntervalMs: number
  /** Sample rate for evaluation (0-1) */
  sampleRate: number
  /** Minimum score threshold for alerts */
  alertThreshold: number
  /** Callback for alerts */
  onAlert?: (alert: EvaluationAlert) => void
  /** Custom evaluators to run */
  evaluators?: CustomEvaluator[]
}

export interface EvaluationAlert {
  runId: string
  evaluator: string
  score: number
  threshold: number
  reasoning: string
  timestamp: Date
}

interface QualityMetrics {
  runsEvaluated: number
  averageScore: number
  alertCount: number
  scoresByEvaluator: Record<string, number[]>
  lastUpdated: Date
}

const DEFAULT_CONFIG: Partial<OnlineEvaluationConfig> = {
  pollIntervalMs: 60000, // 1 minute
  sampleRate: 0.1, // 10% of runs
  alertThreshold: 0.5,
  evaluators: [hallucinationHeuristic, consistencyHeuristic, ragGroundingHeuristic],
}

/**
 * Online evaluation monitor class
 */
export class OnlineEvaluationMonitor {
  private client: Client
  private config: OnlineEvaluationConfig
  private metrics: QualityMetrics
  private lastProcessedTime: Date
  private isRunning: boolean = false
  private pollInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<OnlineEvaluationConfig> & { projectName: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as OnlineEvaluationConfig
    this.client = new Client({
      apiKey: process.env.LANGCHAIN_API_KEY,
    })
    this.lastProcessedTime = new Date(Date.now() - 3600000) // Start from 1 hour ago
    this.metrics = {
      runsEvaluated: 0,
      averageScore: 0,
      alertCount: 0,
      scoresByEvaluator: {},
      lastUpdated: new Date(),
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Monitor is already running')
      return
    }

    console.log('🔍 Starting online evaluation monitor')
    console.log(`   Project: ${this.config.projectName}`)
    console.log(`   Poll interval: ${this.config.pollIntervalMs}ms`)
    console.log(`   Sample rate: ${this.config.sampleRate * 100}%`)
    console.log(`   Alert threshold: ${this.config.alertThreshold}`)
    console.log('')

    this.isRunning = true
    this.pollInterval = setInterval(() => this.poll(), this.config.pollIntervalMs)

    // Initial poll
    this.poll()
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('⏹️  Stopping online evaluation monitor')
    this.isRunning = false

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): QualityMetrics {
    return { ...this.metrics }
  }

  /**
   * Poll for new runs and evaluate
   */
  private async poll(): Promise<void> {
    try {
      // Fetch recent runs
      const runs = await this.fetchRecentRuns()

      if (runs.length === 0) {
        return
      }

      console.log(`📥 Found ${runs.length} new runs`)

      // Sample runs based on sample rate
      const sampled = runs.filter(() => Math.random() < this.config.sampleRate)

      if (sampled.length === 0) {
        console.log('   No runs sampled this interval')
        return
      }

      console.log(`📊 Evaluating ${sampled.length} sampled runs`)

      // Evaluate each run
      for (const run of sampled) {
        await this.evaluateRun(run)
      }

      // Update last processed time
      this.lastProcessedTime = new Date()
      this.metrics.lastUpdated = new Date()
    } catch (error) {
      console.error('Poll error:', error)
    }
  }

  /**
   * Fetch runs since last poll
   */
  private async fetchRecentRuns(): Promise<Run[]> {
    const runs: Run[] = []

    try {
      const runIterator = this.client.listRuns({
        projectName: this.config.projectName,
        startTime: this.lastProcessedTime,
        isRoot: true, // Only top-level runs
      })

      for await (const run of runIterator) {
        // Only include completed runs
        if (run.status === 'success' || run.status === 'error') {
          runs.push(run)
        }
      }
    } catch (error) {
      console.error('Error fetching runs:', error)
    }

    return runs
  }

  /**
   * Evaluate a single run
   */
  private async evaluateRun(run: Run): Promise<void> {
    const evaluators = this.config.evaluators || []
    const scores: Record<string, number> = {}

    // Build evaluator input from run
    const evalInput: EvaluatorInput = {
      input: run.inputs || {},
      output: run.outputs || {},
      reference: run.reference_example_id
        ? await this.fetchReference(run.reference_example_id)
        : undefined,
    }

    // Run each evaluator
    for (const evaluator of evaluators) {
      try {
        const result = await evaluator.evaluate(evalInput)
        scores[evaluator.name] = result.score

        // Track scores
        if (!this.metrics.scoresByEvaluator[evaluator.name]) {
          this.metrics.scoresByEvaluator[evaluator.name] = []
        }
        this.metrics.scoresByEvaluator[evaluator.name].push(result.score)

        // Check for alerts
        if (result.score < this.config.alertThreshold) {
          const alert: EvaluationAlert = {
            runId: run.id,
            evaluator: evaluator.name,
            score: result.score,
            threshold: this.config.alertThreshold,
            reasoning: result.reasoning,
            timestamp: new Date(),
          }

          this.metrics.alertCount++
          console.log(`⚠️  Alert: ${evaluator.name} score ${result.score} < ${this.config.alertThreshold}`)

          if (this.config.onAlert) {
            this.config.onAlert(alert)
          }
        }

        // Post feedback to LangSmith
        await this.postFeedback(run.id, evaluator.name, result.score, result.reasoning)
      } catch (error) {
        console.error(`Error running evaluator ${evaluator.name}:`, error)
      }
    }

    // Update metrics
    this.metrics.runsEvaluated++
    const allScores = Object.values(scores)
    if (allScores.length > 0) {
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length
      this.metrics.averageScore =
        (this.metrics.averageScore * (this.metrics.runsEvaluated - 1) + avgScore) /
        this.metrics.runsEvaluated
    }

    console.log(`   Run ${run.id.slice(0, 8)}: avg score ${(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length * 100).toFixed(1)}%`)
  }

  /**
   * Fetch reference example for a run
   */
  private async fetchReference(exampleId: string): Promise<Record<string, unknown> | undefined> {
    try {
      const example = await this.client.readExample(exampleId)
      return example.outputs || undefined
    } catch {
      return undefined
    }
  }

  /**
   * Post feedback to LangSmith
   */
  private async postFeedback(
    runId: string,
    evaluatorName: string,
    score: number,
    comment: string
  ): Promise<void> {
    try {
      await this.client.createFeedback(runId, evaluatorName, {
        score,
        comment,
        sourceInfo: {
          method: 'online-evaluation',
          version: '1.0',
        },
      })
    } catch (error) {
      // Feedback posting is best-effort
      console.warn('Failed to post feedback:', error)
    }
  }
}

/**
 * Setup online evaluation with default configuration
 */
export function setupOnlineEvaluation(
  config: Partial<OnlineEvaluationConfig> & { projectName: string }
): OnlineEvaluationMonitor {
  const monitor = new OnlineEvaluationMonitor(config)
  return monitor
}

/**
 * Quick start function for CLI
 */
export async function startMonitoring() {
  const projectName = process.env.LANGCHAIN_PROJECT || 'default'

  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ LANGCHAIN_API_KEY is not set')
    process.exit(1)
  }

  console.log('🚀 Online Evaluation Monitor')
  console.log('============================')

  const monitor = setupOnlineEvaluation({
    projectName,
    pollIntervalMs: 30000, // 30 seconds for demo
    sampleRate: 0.5, // 50% for demo
    alertThreshold: 0.5,
    onAlert: (alert) => {
      console.log('')
      console.log('🚨 ALERT')
      console.log(`   Run: ${alert.runId}`)
      console.log(`   Evaluator: ${alert.evaluator}`)
      console.log(`   Score: ${alert.score} (threshold: ${alert.threshold})`)
      console.log(`   Reason: ${alert.reasoning}`)
    },
  })

  monitor.start()

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('')
    console.log('Shutting down...')
    monitor.stop()

    const metrics = monitor.getMetrics()
    console.log('')
    console.log('📊 Final Metrics')
    console.log(`   Runs evaluated: ${metrics.runsEvaluated}`)
    console.log(`   Average score: ${(metrics.averageScore * 100).toFixed(1)}%`)
    console.log(`   Alerts: ${metrics.alertCount}`)

    process.exit(0)
  })

  // Keep process running
  console.log('')
  console.log('Press Ctrl+C to stop monitoring')
}

// Run if executed directly
if (require.main === module) {
  startMonitoring()
}

