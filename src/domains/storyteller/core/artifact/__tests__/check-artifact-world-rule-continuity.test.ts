import { describe, expect, it } from 'vitest'
import { checkArtifactWorldRuleContinuity } from '@/domains/storyteller/core/artifact/check-artifact-world-rule-continuity'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { FindingSeverity, ProblemType } from '@/domains/storyteller/core/types/finding'

const DEAD_CANNOT_VOTE = 'The dead cannot vote'

describe('checkArtifactWorldRuleContinuity', () => {
  it('flags a faction that lets the dead vote against a cannot-vote rule', () => {
    const findings = checkArtifactWorldRuleContinuity({
      kind: ArtifactKind.BibleSection,
      section: BibleSection.FACTIONS,
      worldRules: [DEAD_CANNOT_VOTE],
      draft: 'Marsh priests let the dead vote in council.',
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]?.location.section).toBe(BibleSection.FACTIONS)
    expect(findings[0]?.location.beatId).toBeUndefined()
    expect(findings[0]?.problemType).toBe(ProblemType.ChapterContinuity)
    expect(findings[0]?.severity).toBe(FindingSeverity.Error)
    expect(findings[0]?.whyItFails).toContain(DEAD_CANNOT_VOTE)
  })

  it('does not flag a faction that restates the prohibition', () => {
    const findings = checkArtifactWorldRuleContinuity({
      kind: ArtifactKind.BibleSection,
      section: BibleSection.FACTIONS,
      worldRules: [DEAD_CANNOT_VOTE],
      draft: 'Wardens enforce that the dead cannot vote.',
    })
    expect(findings).toEqual([])
  })

  it('skips character drafts', () => {
    const findings = checkArtifactWorldRuleContinuity({
      kind: ArtifactKind.Character,
      worldRules: [DEAD_CANNOT_VOTE],
      draft: 'Vera teaches the dead to vote.',
    })
    expect(findings).toEqual([])
  })
})
