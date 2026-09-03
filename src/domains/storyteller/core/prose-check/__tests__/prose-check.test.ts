import { describe, expect, it } from 'vitest'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { FindingSeverity, ProblemType } from '@/domains/storyteller/core/types/finding'
import { emptyBeatDraftCanon } from '@/domains/storyteller/core/types/beat-draft-canon'
import { runSyncProseCheck } from '../run-sync'

describe('runSyncProseCheck', () => {
  it('flags a phantom orphan when nextSequence is 2 and deps are empty', () => {
    const canon = emptyBeatDraftCanon({
      nextSequence: 2,
      beats: [
        {
          id: 'beat-1',
          sequence: 1,
          content: 'INT. START',
          causalDependencies: [],
          beatType: 'setup',
        },
      ],
    })
    const findings = runSyncProseCheck({
      draft: 'INT. CHAPEL',
      canon,
      characters: ['Vera'],
    })
    expect(findings.some(finding => finding.problemType === ProblemType.SpatialOrActionCausality)).toBe(
      true
    )
    expect(findings.some(finding => finding.severity === FindingSeverity.Error)).toBe(true)
  })

  it('returns identical findings for identical input', () => {
    const canon = emptyBeatDraftCanon({
      nextSequence: 2,
      sections: { [BibleSection.PLOT_TWISTS]: [{ secret: 'THE_BELLS_ARE_VERA' }] },
      beats: [
        {
          id: 'beat-1',
          sequence: 1,
          content: 'INT. START',
          causalDependencies: [],
          beatType: 'setup',
        },
      ],
    })
    const input = {
      draft: 'INT. CHAPEL\nVera already knows THE_BELLS_ARE_VERA.',
      canon,
      characters: ['Vera'],
    }
    expect(runSyncProseCheck(input)).toEqual(runSyncProseCheck(input))
  })
})
