/**
 * Judge cost comes off Mastra's scorer result, never out of `llm_calls` —
 * ADR 0003 keeps judge calls out of that table, and reading spend from there
 * would both inflate per-project totals and measure the wrong thing.
 */
import { describe, expect, it } from 'vitest'
import { addJudgeUsage, EMPTY_JUDGE_USAGE, judgeUsageOf } from '../judge-usage'

const PRICED_MODEL = 'openai/gpt-4o-mini'
const UNKNOWN_MODEL = 'acme/does-not-exist'

function resultWith(model: string, inputTokens: number, outputTokens: number) {
  return {
    score: 1,
    judge: {
      analyze: {
        executions: [{ judgeModelId: model, usage: { inputTokens, outputTokens } }],
      },
    },
  }
}

describe('judgeUsageOf', () => {
  it('sums the tokens a judge actually used', () => {
    const usage = judgeUsageOf(resultWith(PRICED_MODEL, 1000, 200), PRICED_MODEL)

    expect(usage.inputTokens).toBe(1000)
    expect(usage.outputTokens).toBe(200)
  })

  it('prices them from the committed table', () => {
    const usage = judgeUsageOf(resultWith(PRICED_MODEL, 1_000_000, 1_000_000), PRICED_MODEL)

    expect(usage.costUsd).toBeCloseTo(0.15 + 0.6, 5)
  })

  it('names an unpriced model rather than costing it at zero', () => {
    const usage = judgeUsageOf(resultWith(UNKNOWN_MODEL, 1000, 100), UNKNOWN_MODEL)

    expect(usage.unpricedModels).toEqual([UNKNOWN_MODEL])
    expect(usage.costUsd).toBe(0)
  })

  it('returns nothing for a deterministic scorer, which calls no judge', () => {
    const usage = judgeUsageOf({ score: 1 }, PRICED_MODEL)

    expect(usage).toEqual(EMPTY_JUDGE_USAGE)
  })
})

describe('addJudgeUsage', () => {
  it('accumulates across scorers and dedupes the unpriced list', () => {
    const one = judgeUsageOf(resultWith(UNKNOWN_MODEL, 10, 1), UNKNOWN_MODEL)
    const two = judgeUsageOf(resultWith(UNKNOWN_MODEL, 20, 2), UNKNOWN_MODEL)

    const total = addJudgeUsage(addJudgeUsage(EMPTY_JUDGE_USAGE, one), two)

    expect(total.inputTokens).toBe(30)
    expect(total.unpricedModels).toEqual([UNKNOWN_MODEL])
  })
})
