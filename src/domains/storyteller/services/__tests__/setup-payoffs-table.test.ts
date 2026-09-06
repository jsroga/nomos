import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkSetupPayoffsFromRows } from '@/domains/storyteller/services/consistency-service'
import {
  ConsistencyIssueType,
  ConsistencySeverity,
} from '@/domains/storyteller/services/constants/consistency-issues'

describe('checkSetupPayoffsFromRows', () => {
  it('reads MissingPayoff and OrphanedSetup from the setups table shape', () => {
    const issues = checkSetupPayoffsFromRows(
      [
        { setupBeatId: 's1', payoffBeatId: null, description: 'the ledger' },
        { setupBeatId: null, payoffBeatId: 'p1', description: 'the confession' },
      ],
      new Set(['s1', 'p1'])
    )

    const missing = issues.find(issue => issue.type === ConsistencyIssueType.MissingPayoff)
    const orphaned = issues.find(issue => issue.type === ConsistencyIssueType.OrphanedSetup)
    expect(missing?.severity).toBe(ConsistencySeverity.Minor)
    expect(orphaned?.severity).toBe(ConsistencySeverity.Major)
  })

  it('loads those rows from the setups table', () => {
    const source = readFileSync(
      'src/domains/storyteller/services/consistency-service.ts',
      'utf8'
    )
    expect(source).toContain('from(setups)')
  })
})
