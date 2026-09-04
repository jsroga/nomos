import { describe, expect, it } from 'vitest'
import { unknownCostRows } from '../spend.mjs'

interface SpendCostRow {
  key: string
  cost_status: string
  calls?: number
  tokens?: number
  cost?: number
}

describe('unknownCostRows', () => {
  it('keeps only cost_status=unknown rows', () => {
    const rows: SpendCostRow[] = [
      { key: 'openai/gpt-4o', cost_status: 'priced', calls: 2, tokens: 100 },
      { key: 'acme/x', cost_status: 'unknown', calls: 1, tokens: 50 },
    ]

    expect(unknownCostRows(rows).map((row: SpendCostRow) => row.key)).toEqual(['acme/x'])
  })

  it('does not treat a priced $0 row as unpriced', () => {
    const rows: SpendCostRow[] = [
      { key: 'openai/gpt-4o', cost_status: 'priced', cost: 0, tokens: 0 },
    ]
    expect(unknownCostRows(rows)).toEqual([])
  })
})
