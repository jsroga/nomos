/**
 * Regression Detection Module
 *
 * Compares current evaluation run against baseline and detects quality drops.
 * Features:
 * - Automatic baseline management
 * - Statistical significance testing
 * - Per-example failure tracking
 * - Detailed regression reports
 *
 * Usage:
 *   npm run eval:regression
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// ============================================
// TYPES
// ============================================

export interface ExperimentResult {
  experimentId: string
  datasetName: string
  results: Array<{
    exampleId: string
    scores: Record<string, number>
    reasoning: Record<string, string>
  }>
  aggregatedScores: Record<string, number>
  timestamp: Date
  executionTimeMs?: number
  passRate?: number
}

export interface RegressionItem {
  evaluator: string
  baselineScore: number
  currentScore: number
  delta: number
  percentChange: number
  significance: 'critical' | 'warning' | 'ok' | 'improved'
  pValue?: number
}

export interface ExampleRegression {
  exampleId: string
  baselineAvg: number
  currentAvg: number
  delta: number
  failedEvaluators: string[]
}

export interface RegressionReport {
  baseline: {
    experimentId: string
    timestamp: Date
    passRate: number
  }
  current: {
    experimentId: string
    timestamp: Date
    passRate: number
  }
  regressions: RegressionItem[]
  newFailures: ExampleRegression[]
  fixedExamples: string[]
  overallStatus: 'pass' | 'warning' | 'fail'
  summary: string
}

// ============================================
// CONFIGURATION
// ============================================

interface RegressionConfig {
  baselinePath: string
  criticalThreshold: number // Score drop to trigger critical
  warningThreshold: number // Score drop to trigger warning
  improvementThreshold: number // Score increase to flag as improved
  minSampleSize: number // Minimum samples for statistical significance
}

const DEFAULT_CONFIG: RegressionConfig = {
  baselinePath: './.eval-baseline.json',
  criticalThreshold: 0.1, // 10% drop = critical
  warningThreshold: 0.05, // 5% drop = warning
  improvementThreshold: 0.05, // 5% improvement = flag
  minSampleSize: 5,
}

// ============================================
// BASELINE MANAGEMENT
// ============================================

export async function loadBaseline(
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<ExperimentResult | null> {
  try {
    const data = await fs.readFile(config.baselinePath, 'utf-8')
    const baseline = JSON.parse(data) as ExperimentResult
    baseline.timestamp = new Date(baseline.timestamp)
    return baseline
  } catch {
    return null
  }
}

export async function saveBaseline(
  result: ExperimentResult,
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<void> {
  await fs.writeFile(config.baselinePath, JSON.stringify(result, null, 2))
  console.log(`✅ Baseline saved to ${config.baselinePath}`)
}

export async function loadResultFile(filePath: string): Promise<ExperimentResult> {
  const data = await fs.readFile(filePath, 'utf-8')
  const result = JSON.parse(data) as ExperimentResult
  result.timestamp = new Date(result.timestamp)
  return result
}

// ============================================
// STATISTICAL ANALYSIS
// ============================================

/**
 * Calculate mean and standard deviation
 */
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

  return { mean, stdDev: Math.sqrt(variance) }
}

/**
 * Welch's t-test for comparing two samples with potentially different variances
 * Returns p-value (lower = more significant difference)
 */
function welchTTest(sample1: number[], sample2: number[]): number {
  const stats1 = calculateStats(sample1)
  const stats2 = calculateStats(sample2)

  const n1 = sample1.length
  const n2 = sample2.length

  if (n1 < 2 || n2 < 2) return 1 // Not enough samples

  const var1 = Math.pow(stats1.stdDev, 2)
  const var2 = Math.pow(stats2.stdDev, 2)

  // Calculate t-statistic
  const se = Math.sqrt(var1 / n1 + var2 / n2)
  if (se === 0) return stats1.mean === stats2.mean ? 1 : 0

  const t = (stats1.mean - stats2.mean) / se

  // Calculate degrees of freedom (Welch-Satterthwaite)
  const num = Math.pow(var1 / n1 + var2 / n2, 2)
  const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1)
  const df = denom > 0 ? num / denom : 1

  // Approximate p-value using normal distribution for large df
  // For a more accurate p-value, we'd use a t-distribution table
  const absT = Math.abs(t)

  // Approximate two-tailed p-value
  // Using normal approximation which works well for df > 30
  const pValue = 2 * (1 - normalCDF(absT))

  return pValue
}

/**
 * Standard normal cumulative distribution function (approximation)
 */
function normalCDF(x: number): number {
  // Approximation using Abramowitz and Stegun formula 7.1.26
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

// ============================================
// REGRESSION DETECTION
// ============================================

export function detectRegressions(
  baseline: ExperimentResult,
  current: ExperimentResult,
  config: RegressionConfig = DEFAULT_CONFIG
): RegressionReport {
  const regressions: RegressionItem[] = []
  const newFailures: ExampleRegression[] = []
  const fixedExamples: string[] = []

  // Get all evaluator names from both results
  const evaluatorNames = new Set<string>([
    ...Object.keys(baseline.aggregatedScores),
    ...Object.keys(current.aggregatedScores),
  ])

  // Compare aggregated scores
  for (const evaluator of evaluatorNames) {
    const baselineScore = baseline.aggregatedScores[evaluator] ?? 0
    const currentScore = current.aggregatedScores[evaluator] ?? 0
    const delta = currentScore - baselineScore
    const percentChange = baselineScore > 0 ? delta / baselineScore : 0

    // Get per-example scores for statistical testing
    const baselineScores = baseline.results
      .map(r => r.scores[evaluator])
      .filter(s => s !== undefined)

    const currentScores = current.results.map(r => r.scores[evaluator]).filter(s => s !== undefined)

    let pValue: number | undefined
    if (
      baselineScores.length >= config.minSampleSize &&
      currentScores.length >= config.minSampleSize
    ) {
      pValue = welchTTest(baselineScores, currentScores)
    }

    // Determine significance
    let significance: RegressionItem['significance'] = 'ok'

    if (delta < -config.criticalThreshold) {
      significance = 'critical'
    } else if (delta < -config.warningThreshold) {
      significance = 'warning'
    } else if (delta > config.improvementThreshold) {
      significance = 'improved'
    }

    regressions.push({
      evaluator,
      baselineScore,
      currentScore,
      delta,
      percentChange,
      significance,
      pValue,
    })
  }

  // Compare individual examples
  const baselineExampleMap = new Map(baseline.results.map(r => [r.exampleId, r]))

  const currentExampleMap = new Map(current.results.map(r => [r.exampleId, r]))

  const passThreshold = 0.5

  // Find examples that regressed or fixed
  for (const [exampleId, currentResult] of currentExampleMap) {
    const baselineResult = baselineExampleMap.get(exampleId)

    if (!baselineResult) continue // New example, skip

    const baselineAvg =
      Object.values(baselineResult.scores).length > 0
        ? Object.values(baselineResult.scores).reduce((a, b) => a + b, 0) /
          Object.values(baselineResult.scores).length
        : 0

    const currentAvg =
      Object.values(currentResult.scores).length > 0
        ? Object.values(currentResult.scores).reduce((a, b) => a + b, 0) /
          Object.values(currentResult.scores).length
        : 0

    const baselinePassed = baselineAvg >= passThreshold
    const currentPassed = currentAvg >= passThreshold

    if (baselinePassed && !currentPassed) {
      // Example regressed from pass to fail
      const failedEvaluators = Object.entries(currentResult.scores)
        .filter(([name, score]) => {
          const baseScore = baselineResult.scores[name] ?? 0
          return score < baseScore - config.warningThreshold
        })
        .map(([name]) => name)

      newFailures.push({
        exampleId,
        baselineAvg,
        currentAvg,
        delta: currentAvg - baselineAvg,
        failedEvaluators,
      })
    } else if (!baselinePassed && currentPassed) {
      // Example fixed from fail to pass
      fixedExamples.push(exampleId)
    }
  }

  // Determine overall status
  const criticalCount = regressions.filter(r => r.significance === 'critical').length
  const warningCount = regressions.filter(r => r.significance === 'warning').length

  let overallStatus: RegressionReport['overallStatus'] = 'pass'
  if (criticalCount > 0 || newFailures.length > 3) {
    overallStatus = 'fail'
  } else if (warningCount > 0 || newFailures.length > 0) {
    overallStatus = 'warning'
  }

  // Generate summary
  const summary = generateSummary(regressions, newFailures, fixedExamples, overallStatus)

  return {
    baseline: {
      experimentId: baseline.experimentId,
      timestamp: baseline.timestamp,
      passRate: baseline.passRate ?? 0,
    },
    current: {
      experimentId: current.experimentId,
      timestamp: current.timestamp,
      passRate: current.passRate ?? 0,
    },
    regressions,
    newFailures,
    fixedExamples,
    overallStatus,
    summary,
  }
}

function generateSummary(
  regressions: RegressionItem[],
  newFailures: ExampleRegression[],
  fixedExamples: string[],
  status: 'pass' | 'warning' | 'fail'
): string {
  const critical = regressions.filter(r => r.significance === 'critical')
  const warnings = regressions.filter(r => r.significance === 'warning')
  const improved = regressions.filter(r => r.significance === 'improved')

  const lines: string[] = []

  if (status === 'pass') {
    lines.push('✅ No significant regressions detected')
  } else if (status === 'warning') {
    lines.push('⚠️  Minor regressions detected')
  } else {
    lines.push('❌ Critical regressions detected')
  }

  if (critical.length > 0) {
    lines.push(
      `Critical: ${critical.map(r => `${r.evaluator} (${(r.delta * 100).toFixed(1)}%)`).join(', ')}`
    )
  }

  if (warnings.length > 0) {
    lines.push(`Warnings: ${warnings.map(r => r.evaluator).join(', ')}`)
  }

  if (newFailures.length > 0) {
    lines.push(`New failures: ${newFailures.length} examples`)
  }

  if (improved.length > 0) {
    lines.push(
      `Improved: ${improved.map(r => `${r.evaluator} (+${(r.delta * 100).toFixed(1)}%)`).join(', ')}`
    )
  }

  if (fixedExamples.length > 0) {
    lines.push(`Fixed: ${fixedExamples.length} examples`)
  }

  return lines.join('\n')
}

// ============================================
// REPORTING
// ============================================

export function printReport(report: RegressionReport): void {
  console.log('\n============================================')
  console.log('📊 Regression Report')
  console.log('============================================')

  console.log(`\nBaseline: ${report.baseline.experimentId}`)
  console.log(`  Timestamp: ${report.baseline.timestamp.toISOString()}`)
  console.log(`  Pass rate: ${(report.baseline.passRate * 100).toFixed(1)}%`)

  console.log(`\nCurrent: ${report.current.experimentId}`)
  console.log(`  Timestamp: ${report.current.timestamp.toISOString()}`)
  console.log(`  Pass rate: ${(report.current.passRate * 100).toFixed(1)}%`)

  const passRateDelta = report.current.passRate - report.baseline.passRate
  const passRateIcon = passRateDelta >= 0 ? '📈' : '📉'
  console.log(`\n${passRateIcon} Pass rate change: ${(passRateDelta * 100).toFixed(1)}%`)

  console.log('\n─────────────────────────────────────────────')
  console.log('Evaluator Comparison:')
  console.log('─────────────────────────────────────────────')

  // Sort: critical first, then warning, then improved, then ok
  const sortedRegressions = [...report.regressions].sort((a, b) => {
    const order = { critical: 0, warning: 1, improved: 2, ok: 3 }
    return order[a.significance] - order[b.significance]
  })

  for (const reg of sortedRegressions) {
    let icon = '  '
    switch (reg.significance) {
      case 'critical':
        icon = '🔴'
        break
      case 'warning':
        icon = '🟡'
        break
      case 'improved':
        icon = '🟢'
        break
      case 'ok':
        icon = '⚪'
        break
    }

    const deltaStr =
      reg.delta >= 0 ? `+${(reg.delta * 100).toFixed(1)}%` : `${(reg.delta * 100).toFixed(1)}%`
    const pValueStr = reg.pValue !== undefined ? ` (p=${reg.pValue.toFixed(3)})` : ''

    console.log(`${icon} ${reg.evaluator}:`)
    console.log(
      `   Baseline: ${(reg.baselineScore * 100).toFixed(1)}% → Current: ${(reg.currentScore * 100).toFixed(1)}% (${deltaStr})${pValueStr}`
    )
  }

  if (report.newFailures.length > 0) {
    console.log('\n─────────────────────────────────────────────')
    console.log('❌ New Failures:')
    console.log('─────────────────────────────────────────────')

    for (const failure of report.newFailures.slice(0, 10)) {
      console.log(`  ${failure.exampleId}`)
      console.log(
        `    Score: ${(failure.baselineAvg * 100).toFixed(1)}% → ${(failure.currentAvg * 100).toFixed(1)}%`
      )
      if (failure.failedEvaluators.length > 0) {
        console.log(`    Failed evaluators: ${failure.failedEvaluators.join(', ')}`)
      }
    }

    if (report.newFailures.length > 10) {
      console.log(`  ... and ${report.newFailures.length - 10} more`)
    }
  }

  if (report.fixedExamples.length > 0) {
    console.log('\n─────────────────────────────────────────────')
    console.log('✅ Fixed Examples:')
    console.log('─────────────────────────────────────────────')

    for (const id of report.fixedExamples.slice(0, 5)) {
      console.log(`  ${id}`)
    }

    if (report.fixedExamples.length > 5) {
      console.log(`  ... and ${report.fixedExamples.length - 5} more`)
    }
  }

  console.log('\n============================================')
  console.log('Summary:')
  console.log('============================================')
  console.log(report.summary)
  console.log('')
}

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const resultsPath = args.find(a => a.endsWith('.json') && !a.startsWith('--'))
  const shouldUpdateBaseline = args.includes('--update-baseline')
  const configPath = args.find(a => a.startsWith('--baseline='))?.split('=')[1]

  const config: RegressionConfig = {
    ...DEFAULT_CONFIG,
    baselinePath: configPath || DEFAULT_CONFIG.baselinePath,
  }

  console.log('🔍 Regression Detection')
  console.log('============================================')

  // Load baseline
  const baseline = await loadBaseline(config)

  if (!baseline) {
    if (resultsPath) {
      // No baseline exists, create one from the provided results
      const current = await loadResultFile(resultsPath)
      await saveBaseline(current, config)
      console.log('\n📋 Created new baseline from results')
      console.log('   Run evaluation again to compare against baseline')
      process.exit(0)
    } else {
      console.log('\n⚠️  No baseline found')
      console.log('   Run: npm run eval:storyteller:fast first')
      console.log('   Then: npm run eval:regression <results-file.json>')
      process.exit(1)
    }
  }

  console.log(`Baseline: ${config.baselinePath}`)

  // Load current results
  let current: ExperimentResult

  if (resultsPath) {
    current = await loadResultFile(resultsPath)
    console.log(`Current results: ${resultsPath}`)
  } else {
    // Find most recent eval-results-*.json file
    const cwd = process.cwd()
    const files = await fs.readdir(cwd)
    const resultFiles = files
      .filter(f => f.startsWith('eval-results-') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (resultFiles.length === 0) {
      console.log('\n⚠️  No results file found')
      console.log('   Run: npm run eval:storyteller:fast first')
      process.exit(1)
    }

    const latestFile = resultFiles[0]
    current = await loadResultFile(path.join(cwd, latestFile))
    console.log(`Current results: ${latestFile}`)
  }

  // Detect regressions
  const report = detectRegressions(baseline, current, config)

  // Print report
  printReport(report)

  // Update baseline if requested
  if (shouldUpdateBaseline) {
    if (report.overallStatus === 'fail') {
      console.log('\n⚠️  Cannot update baseline with failing results')
      console.log('   Fix regressions first or use --force')
    } else {
      await saveBaseline(current, config)
    }
  }

  // Exit with appropriate code
  if (report.overallStatus === 'fail') {
    process.exit(1)
  } else if (report.overallStatus === 'warning') {
    process.exit(0) // Warnings don't fail CI
  } else {
    process.exit(0)
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
