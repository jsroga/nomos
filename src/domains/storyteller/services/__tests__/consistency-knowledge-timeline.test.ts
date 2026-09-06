import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { checkCharacterKnowledgeFromRows } from '@/domains/storyteller/services/consistency-knowledge'
import { checkTimelineFromRows } from '@/domains/storyteller/services/consistency-timeline'
import {
  ConsistencyIssueType,
  ConsistencySeverity,
} from '@/domains/storyteller/services/constants/consistency-issues'
import type { ConsistencyBeatSlice } from '@/domains/storyteller/services/consistency-types'

const SECRET = 'THE_BELLS_ARE_VERA'

function beat(overrides: Partial<ConsistencyBeatSlice> & Pick<ConsistencyBeatSlice, 'id' | 'sequence'>): ConsistencyBeatSlice {
  return {
    beatType: 'setup',
    causalDependencies: [],
    content: null,
    charactersInvolved: [],
    ...overrides,
  }
}

describe('consistency timeline jsonb', () => {
  it('flags a mid-sequence beat with empty causalDependencies', () => {
    const issues = checkTimelineFromRows([
      beat({ id: 'b1', sequence: 1 }),
      beat({ id: 'b2', sequence: 2 }),
    ])
    expect(issues.some(issue => issue.type === ConsistencyIssueType.Timeline)).toBe(true)
    expect(issues[0]?.severity).toBe(ConsistencySeverity.Major)
  })

  it('flags a forward causal dependency', () => {
    const issues = checkTimelineFromRows([
      beat({ id: 'b1', sequence: 1, causalDependencies: ['b2'] }),
      beat({ id: 'b2', sequence: 2, causalDependencies: ['b1'] }),
    ])
    expect(
      issues.some(
        issue =>
          issue.type === ConsistencyIssueType.Timeline &&
          issue.severity === ConsistencySeverity.Critical
      )
    ).toBe(true)
  })
})

describe('consistency character knowledge partition', () => {
  it('flags a plot-twist token that is not in story facts', () => {
    const issues = checkCharacterKnowledgeFromRows(
      [beat({ id: 'b1', sequence: 1, content: `Vera already knows ${SECRET}.` })],
      {
        [BibleSection.PLOT_TWISTS]: [{ secret: SECRET }],
        worldDescription: 'A frozen ward holds the last ledger.',
      }
    )
    expect(issues.some(issue => issue.type === ConsistencyIssueType.KnowledgeViolation)).toBe(true)
  })

  it('does not flag a token already in story facts', () => {
    const issues = checkCharacterKnowledgeFromRows(
      [beat({ id: 'b1', sequence: 1, content: `Vera already knows ${SECRET}.` })],
      {
        [BibleSection.PLOT_TWISTS]: [{ secret: SECRET }],
        worldDescription: `Everyone in the ward knows ${SECRET}.`,
      }
    )
    expect(issues).toEqual([])
  })
})
