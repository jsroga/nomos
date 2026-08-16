import { describe, expect, it } from 'vitest'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import {
  BibleSectionDisplayName,
  SectionListJoin,
  addToWorldSectionLabels,
  formatBibleSectionList,
  isNonBibleToolPayload,
  mergeAddToWorldProposals,
} from '../merge-add-to-world-proposals'
import type { ProposedBibleSectionUpdate } from '../propose-assistant-bible-update'

function proposal(
  section: BibleSection,
  preview: Record<string, unknown>,
): ProposedBibleSectionUpdate {
  return {
    section,
    preview,
    dedupeKey: section,
    action: {
      type: ActionType.UPDATE_SERIES_BIBLE,
      payload: preview,
      status: ApprovalActionStatus.PENDING,
      id: section,
    },
  }
}

describe('mergeAddToWorldProposals', () => {
  it('lists Overview, Factions, and Plot twists from tool args', () => {
    const merged = mergeAddToWorldProposals({
      toolProposals: [
        proposal(BibleSection.WORLD_DESCRIPTION, { worldDescription: 'A' }),
        proposal(BibleSection.FACTIONS, { factions: [] }),
        proposal(BibleSection.PLOT_TWISTS, { plotTwists: [] }),
      ],
      pending: {},
      rejectedSections: new Set(),
    })
    expect(formatBibleSectionList(merged.map(item => item.section))).toBe(
      [
        BibleSectionDisplayName.Overview,
        BibleSectionDisplayName.Factions,
        BibleSectionDisplayName.PlotTwists,
      ].join(SectionListJoin.CommaSpace),
    )
  })

  it('omits a rejected section from Add to world', () => {
    const merged = mergeAddToWorldProposals({
      toolProposals: [
        proposal(BibleSection.WORLD_DESCRIPTION, { worldDescription: 'A' }),
        proposal(BibleSection.FACTIONS, { factions: [] }),
      ],
      pending: {},
      rejectedSections: new Set([BibleSection.FACTIONS]),
    })
    expect(merged.map(item => item.section)).toEqual([BibleSection.WORLD_DESCRIPTION])
  })

  it('hides rejected sections from grey Add to world labels', () => {
    expect(
      addToWorldSectionLabels({
        toolArgs: [
          {
            worldDescription: 'A salt-marsh city.',
            factions: [{ name: 'Keepers', description: 'They tally.' }],
          },
        ],
        rejectedSections: new Set([BibleSection.FACTIONS]),
      }),
    ).toEqual([BibleSectionDisplayName.Overview])
  })

  it('treats beat-style tool args as non-bible so chat is not dumped into Overview', () => {
    expect(
      isNonBibleToolPayload([{ beatId: '8db804d0-1c39-498e-97a5-dfd7eb828789', prose: 'She signs.' }]),
    ).toBe(true)
    expect(isNonBibleToolPayload([])).toBe(false)
    expect(isNonBibleToolPayload([{ worldDescription: 'A salt-marsh city.' }])).toBe(false)
  })
})
