import { describe, expect, it } from 'vitest'
import { FindingSeverity, ProblemType } from '@/domains/storyteller/core/types/finding'
import { setupsFindingsFromRows } from '../setups-rows'

describe('setupsFindingsFromRows', () => {
  it('emits MissingPayoff as warning and OrphanedSetup as error', () => {
    const findings = setupsFindingsFromRows(
      [
        {
          setupBeatId: 'setup-1',
          payoffBeatId: null,
          description: 'the ledger',
          isResolved: false,
        },
        {
          setupBeatId: null,
          payoffBeatId: 'payoff-1',
          description: 'the confession',
          isResolved: true,
        },
      ],
      new Set(['setup-1', 'payoff-1'])
    )

    const missing = findings.find(row => row.location.quote === 'the ledger')
    const orphaned = findings.find(row => row.location.quote === 'the confession')
    expect(missing?.severity).toBe(FindingSeverity.Warning)
    expect(missing?.problemType).toBe(ProblemType.SceneStructure)
    expect(orphaned?.severity).toBe(FindingSeverity.Error)
    expect(orphaned?.problemType).toBe(ProblemType.SceneStructure)
  })
})
