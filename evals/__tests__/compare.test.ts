/**
 * Task 4's exit condition: the baseline compared to itself passes, and a
 * hand-degraded copy fails naming the scorer.
 */
import { describe, expect, it } from 'vitest'
import { compareToBaseline, formatComparison, isBrevityCheat, qualityUpCostDoubled, GateFailReason, ScorerVerdict, type EvalBaseline } from '../compare'
import { regressionThreshold } from '../constants/thresholds'
import type { MultiVariantReport } from '../types'

const BASELINE: EvalBaseline = {
  dataset: 'storyteller',
  scorers: {
    magic: { mean: 0.3022 },
    consistency: { mean: 0.6667 },
    'persona-fidelity': { mean: 0.6022 },
  },
}

function reportWith(
  scorerAverages: Record<string, number>,
  failures = 0,
  costUsd?: number,
  unpricedModels: string[] = []
): MultiVariantReport {
  return {
    id: 'eval_test',
    timestamp: '2026-08-28T00:00:00.000Z',
    scenarios: [],
    ...(costUsd === undefined
      ? {}
      : { judgeUsage: { inputTokens: 0, outputTokens: 0, costUsd, unpricedModels } }),
    failures: Array.from({ length: failures }, () => ({
      exampleId: 'x',
      scorerId: 'magic',
      error: 'boom',
    })),
    variants: [
      {
        name: 'baseline',
        config: {},
        overallMetrics: { magicScore: 0, consistency: 0, hallucination: 0, personaFidelity: 0 },
        scenarioMetrics: {},
        scorerAverages,
      },
    ],
  }
}

const IDENTICAL = { magic: 0.3022, consistency: 0.6667, 'persona-fidelity': 0.6022 }

describe('compareToBaseline', () => {
  it('passes when a run matches its baseline exactly', () => {
    const result = compareToBaseline(reportWith(IDENTICAL), BASELINE)

    expect(result.regressions).toEqual([])
  })

  it('tolerates a drop inside the scorer threshold, because judges are stochastic', () => {
    const inside = regressionThreshold('magic') / 2
    const result = compareToBaseline(reportWith({ ...IDENTICAL, magic: 0.3022 - inside }), BASELINE)

    expect(result.regressions).toEqual([])
  })

  it('fails on a drop beyond the threshold and names the scorer', () => {
    const beyond = regressionThreshold('magic') * 2
    const result = compareToBaseline(reportWith({ ...IDENTICAL, magic: 0.3022 - beyond }), BASELINE)

    expect(result.regressions.map(row => row.id)).toEqual(['magic'])
    expect(result.regressions[0].verdict).toBe(ScorerVerdict.Regressed)
  })

  it('fails when a baselined scorer stops reporting, which is how a broken one would hide', () => {
    const { consistency: _dropped, ...withoutConsistency } = IDENTICAL
    const result = compareToBaseline(reportWith(withoutConsistency), BASELINE)

    expect(result.regressions.map(row => row.id)).toEqual(['consistency'])
    expect(result.regressions[0].verdict).toBe(ScorerVerdict.Missing)
  })

  it('reports a new scorer without gating on it', () => {
    const result = compareToBaseline(reportWith({ ...IDENTICAL, 'prose-craft': 0.9 }), BASELINE)

    expect(result.regressions).toEqual([])
    expect(result.rows.find(row => row.id === 'prose-craft')?.verdict).toBe(ScorerVerdict.New)
  })

  it('counts scorer failures, so a broken run cannot read as a clean comparison', () => {
    const result = compareToBaseline(reportWith(IDENTICAL, 2), BASELINE)

    expect(result.failureCount).toBe(2)
  })

  it('treats a move inside noise as no difference', () => {
    const inside = regressionThreshold('magic') / 2
    const result = compareToBaseline(reportWith({ ...IDENTICAL, magic: 0.3022 + inside }), BASELINE)

    expect(result.rows.find(row => row.id === 'magic')?.verdict).toBe(ScorerVerdict.Ok)
  })

  it('fails quality-up / cost-doubled with a named reason', () => {
    const priced: EvalBaseline = { ...BASELINE, judgeCostUsd: 0.1 }
    const result = compareToBaseline(reportWith({ ...IDENTICAL, magic: 0.9 }, 0, 0.2), priced)

    expect(qualityUpCostDoubled(result)).toBe(true)
    expect(GateFailReason.QualityUpCostDoubled).toBe('quality-up / cost-doubled')
  })
})

describe('the cost budget', () => {
  const priced: EvalBaseline = { ...BASELINE, judgeCostUsd: 0.1 }

  it('passes a run costing a little more, because judge output length varies', () => {
    const result = compareToBaseline(reportWith(IDENTICAL, 0, 0.105), priced)

    expect(result.cost?.exceeded).toBe(false)
  })

  it('fails a run costing more than 10% over — a longer prompt scores the same and bills twice', () => {
    const result = compareToBaseline(reportWith(IDENTICAL, 0, 0.2), priced)

    expect(result.cost?.exceeded).toBe(true)
  })

  it('withholds the comparison when a judge model is unpriced, rather than reading $0 as a saving', () => {
    const result = compareToBaseline(reportWith(IDENTICAL, 0, 0, ['acme/unknown']), priced)

    expect(result.cost).toBeNull()
    expect(result.costSkipped).toContain('unpriced')
    expect(formatComparison(result, 'test.json')).toContain('not a $0 win')
  })

  it('reports no cost comparison when the baseline predates cost recording', () => {
    const result = compareToBaseline(reportWith(IDENTICAL, 0, 0.2), BASELINE)

    expect(result.cost).toBeNull()
    expect(result.costSkipped).toContain('no judge cost')
  })
})

describe('formatComparison', () => {
  it('prints every scorer with its allowed drop', () => {
    const table = formatComparison(compareToBaseline(reportWith(IDENTICAL), BASELINE), 'test.json')

    expect(table).toContain('magic')
    expect(table).toContain('test.json')
  })
})

describe('verbosity vs de-slop', () => {
  it('flags brevity that cheats slop by dropping required information', () => {
    expect(isBrevityCheat(0, 0.01)).toBe(true)
    expect(isBrevityCheat(0, 0.4)).toBe(false)
    expect(isBrevityCheat(12, 0.01)).toBe(false)
  })
})
