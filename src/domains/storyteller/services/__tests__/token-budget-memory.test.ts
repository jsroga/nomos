import { describe, expect, it } from 'vitest'
import { ContextBudgetSection } from '@/domains/storyteller/services/constants/token-budget'
import { budgetContext, recalledMemorySection, withRecalledMemory } from '../context/token-budget'

const RECALLED = 'Vera kept the ledger under the ward floor.'

describe('recalled memory token budget', () => {
  it('counts the Memory section when recalled text is present', () => {
    const memory = recalledMemorySection([RECALLED])
    expect(memory).toBeDefined()
    if (memory === undefined) return
    const budgeted = budgetContext({ [ContextBudgetSection.Memory]: memory })
    expect(budgeted.totalTokens).toBeGreaterThan(0)
    expect(budgeted.context).toContain(RECALLED)
  })

  it('injects recalled text into the Memory budget slot', () => {
    const budgeted = budgetContext(
      withRecalledMemory({ [ContextBudgetSection.UserMessage]: 'now' }, RECALLED),
    )
    expect(budgeted.totalTokens).toBeGreaterThan(0)
    expect(budgeted.context).toContain(RECALLED)
  })

  it('omits Memory when recalled text is empty', () => {
    expect(recalledMemorySection(['  ', ''])).toBeUndefined()
    const budgeted = budgetContext({ [ContextBudgetSection.Memory]: recalledMemorySection([]) })
    expect(budgeted.totalTokens).toBe(0)
  })
})
