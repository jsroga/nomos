/**
 * Compare a run against a chosen baseline, and say whether anything regressed.
 *
 * The table this prints is what action 15 wanted as a PR comment. With no CI it
 * is read at a terminal by whoever ran it — a real loss, named in the spec.
 */
import { regressionThreshold, COST_BUDGET_MULTIPLE, DEFAULT_JUDGING_MODEL_ID } from './constants/thresholds'
import type { MultiVariantReport } from './types'
import { isBrevityCheat } from './structural/s8-concrete-noun-density'

export { isBrevityCheat }

const COST_DOUBLED_MULTIPLE = 2

export enum GateFailReason {
  QualityUpCostDoubled = 'quality-up / cost-doubled',
}

export interface BaselineScorer {
  mean: number
  kind?: string
  sigma?: number | null
}

export interface EvalBaseline {
  dataset: string
  scorers: Record<string, BaselineScorer>
  excluded?: Record<string, string>
  /** What the judges cost when this baseline was chosen. JSON baselines may store `null`. */
  judgeCostUsd?: number | null
}

export interface CostComparison {
  baseline: number
  current: number
  allowed: number
  exceeded: boolean
}

export enum ScorerVerdict {
  Ok = 'ok',
  Improved = 'improved',
  Regressed = 'regressed',
  /** In the baseline but absent from the run — a scorer that stopped running. */
  Missing = 'missing',
  /** In the run but not the baseline — new, and not yet gated on. */
  New = 'new',
}

export interface ScorerComparison {
  id: string
  baseline: number | null
  current: number | null
  delta: number | null
  threshold: number
  verdict: ScorerVerdict
}

export interface ComparisonResult {
  rows: ScorerComparison[]
  regressions: ScorerComparison[]
  /** A run with scorer failures is not a measurement and cannot be compared. */
  failureCount: number
  /** Absent when the baseline predates cost recording or the run is unpriced. */
  cost: CostComparison | null
  /** Why cost was withheld — never summarized as a $0 win. */
  costSkipped: string | null
}

enum CostSkipReason {
  UnpricedModels = 'unpriced judge model(s) — not a $0 win',
  MissingBaselineOrCurrent = 'baseline or run has no judge cost',
}

function verdictFor(baseline: number, current: number, threshold: number): ScorerVerdict {
  const delta = current - baseline
  if (Math.abs(delta) <= threshold) return ScorerVerdict.Ok
  if (delta < 0) return ScorerVerdict.Regressed
  return ScorerVerdict.Improved
}

function isRecordedCost(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function resolveCost(
  report: MultiVariantReport,
  baseline: EvalBaseline
): { cost: CostComparison | null; costSkipped: string | null } {
  const before = baseline.judgeCostUsd
  const after = report.judgeUsage?.costUsd
  if (!isRecordedCost(before) || !isRecordedCost(after)) {
    return { cost: null, costSkipped: CostSkipReason.MissingBaselineOrCurrent }
  }

  // A run whose judge model is missing from the price table costs $0 on paper.
  // Compared against a priced baseline that reads as a large saving, so the
  // comparison is withheld rather than inverted.
  if ((report.judgeUsage?.unpricedModels.length ?? 0) > 0) {
    return { cost: null, costSkipped: CostSkipReason.UnpricedModels }
  }
  if (report.judgeUsage?.costComplete === false) {
    return { cost: null, costSkipped: CostSkipReason.UnpricedModels }
  }

  const allowed = before * COST_BUDGET_MULTIPLE
  return {
    cost: { baseline: before, current: after, allowed, exceeded: after > allowed },
    costSkipped: null,
  }
}

export function compareToBaseline(
  report: MultiVariantReport,
  baseline: EvalBaseline
): ComparisonResult {
  const current = report.variants[0]?.scorerAverages ?? {}
  const ids = [...new Set([...Object.keys(baseline.scorers), ...Object.keys(current)])].sort()
  const rows: ScorerComparison[] = []

  for (const id of ids) {
    const threshold = regressionThreshold(
      id,
      report.judgingModelId ?? DEFAULT_JUDGING_MODEL_ID
    )
    const before = baseline.scorers[id]?.mean
    const after = current[id]

    if (before === undefined) {
      rows.push({ id, baseline: null, current: after, delta: null, threshold, verdict: ScorerVerdict.New })
      continue
    }
    if (after === undefined) {
      rows.push({ id, baseline: before, current: null, delta: null, threshold, verdict: ScorerVerdict.Missing })
      continue
    }
    rows.push({
      id,
      baseline: before,
      current: after,
      delta: after - before,
      threshold,
      verdict: verdictFor(before, after, threshold),
    })
  }

  // A scorer that vanished from the run is a regression: it is how a broken
  // scorer would otherwise pass by simply not reporting.
  const regressions = rows.filter(
    row => row.verdict === ScorerVerdict.Regressed || row.verdict === ScorerVerdict.Missing
  )

  const { cost, costSkipped } = resolveCost(report, baseline)

  return {
    rows,
    regressions,
    failureCount: report.failures?.length ?? 0,
    cost,
    costSkipped,
  }
}

export function qualityUpCostDoubled(result: ComparisonResult): boolean {
  if (!result.cost) return false
  const qualityUp = result.rows.some(row => row.verdict === ScorerVerdict.Improved)
  return qualityUp && result.cost.current >= result.cost.baseline * COST_DOUBLED_MULTIPLE
}

function cell(value: number | null, width: number): string {
  return (value === null ? '—' : value.toFixed(4)).padStart(width)
}

export function formatComparison(result: ComparisonResult, baselineName: string): string {
  const lines = [
    '',
    `  baseline: ${baselineName}`,
    '',
    `  ${'scorer'.padEnd(26)}${'baseline'.padStart(9)}${'current'.padStart(9)}${'delta'.padStart(9)}${'allowed'.padStart(9)}  verdict`,
    `  ${'-'.repeat(26 + 9 * 4 + 11)}`,
  ]
  for (const row of result.rows) {
    lines.push(
      `  ${row.id.padEnd(26)}${cell(row.baseline, 9)}${cell(row.current, 9)}` +
        `${cell(row.delta, 9)}${(-row.threshold).toFixed(4).padStart(9)}  ${row.verdict}`
    )
  }
  if (result.cost) {
    lines.push(
      '',
      `  judge cost: $${result.cost.current.toFixed(4)} vs baseline $${result.cost.baseline.toFixed(4)} ` +
        `(allowed $${result.cost.allowed.toFixed(4)})${result.cost.exceeded ? '  OVER BUDGET' : ''}`
    )
  } else if (result.costSkipped === CostSkipReason.UnpricedModels) {
    lines.push('', `  judge cost: skipped (${result.costSkipped})`)
  }
  return lines.join('\n')
}
