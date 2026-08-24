import { describe, expect, it } from 'vitest'
import { collapseFixesByFieldPath, filterLockedFixes } from '../collapse-consistency-fixes'
import {
  ContinuityAffectedKind,
  ContinuityFindingSeverity,
  ContinuityFindingType,
  type ConsistencyFixItem,
  type ContinuityFinding,
} from '../fix-inconsistencies-schema'
import { FixInconsistenciesSkipReason } from '../constants/fix-inconsistencies-workflow'
import type { AssembledCanon } from '../fix-inconsistencies-contract'

const FINDING_A: ContinuityFinding = {
  id: 'a',
  type: ContinuityFindingType.Character,
  severity: ContinuityFindingSeverity.Critical,
  quote: 'a',
  why: 'a',
  affected: [{ kind: ContinuityAffectedKind.Character, id: 'c1', fieldPath: 'description' }],
  patchable: true,
}

const FINDING_B: ContinuityFinding = {
  ...FINDING_A,
  id: 'b',
  severity: ContinuityFindingSeverity.Minor,
}

function fix(id: string, inconsistencyId: string, path = 'description'): ConsistencyFixItem {
  return {
    id,
    inconsistencyId,
    targetElement: { type: ContinuityAffectedKind.Character, id: 'c1' },
    changes: [{ path, before: 'old', after: 'new', reason: 'fix' }],
  }
}

const CANON: AssembledCanon = {
  empty: false,
  projectId: 'p1',
  bibleJson: '{}',
  charactersJson: '[]',
  worldRulesJson: '[]',
  // Required by AssembledCanonSchema; empty here because these cases exercise
  // fix collapsing, which never reads a section.
  sectionsJson: {},
  episodes: [],
  bibleLocked: true,
  lockedBeatIds: ['beat-locked'],
  lockedCharacterIds: [],
}

describe('collapseFixesByFieldPath', () => {
  it('keeps the higher-severity patch when two fixes hit the same field', () => {
    const result = collapseFixesByFieldPath(
      [fix('f-minor', 'b'), fix('f-critical', 'a')],
      [FINDING_A, FINDING_B]
    )
    expect(result.fixes).toHaveLength(1)
    expect(result.fixes[0]?.id).toBe('f-critical')
    expect(result.skipped[0]?.reason).toBe(FixInconsistenciesSkipReason.Overlap)
  })
})

describe('filterLockedFixes', () => {
  it('skips world-rule patches when the bible is locked', () => {
    const worldFix: ConsistencyFixItem = {
      id: 'w1',
      inconsistencyId: 'a',
      targetElement: { type: ContinuityAffectedKind.WorldRule, id: 'rule-1' },
      changes: [{ path: 'rule', before: 'x', after: 'y', reason: 'canon' }],
    }
    const result = filterLockedFixes(CANON, [worldFix, fix('c1', 'a')])
    expect(result.fixes).toHaveLength(1)
    expect(result.fixes[0]?.id).toBe('c1')
    expect(result.skipped[0]?.reason).toBe(FixInconsistenciesSkipReason.Locked)
  })

  it('skips locked beats', () => {
    const beatFix: ConsistencyFixItem = {
      id: 'b1',
      inconsistencyId: 'a',
      targetElement: { type: ContinuityAffectedKind.Beat, id: 'beat-locked' },
      changes: [{ path: 'logline', before: 'x', after: 'y', reason: 'canon' }],
    }
    const result = filterLockedFixes(CANON, [beatFix])
    expect(result.fixes).toHaveLength(0)
    expect(result.skipped[0]?.reason).toBe(FixInconsistenciesSkipReason.Locked)
  })
})
