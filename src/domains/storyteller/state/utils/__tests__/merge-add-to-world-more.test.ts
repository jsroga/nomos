import { describe, expect, it } from 'vitest'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import {
  BibleSectionDisplayName,
  addToWorldSectionLabels,
  areAddToWorldSectionsSettled,
  bibleSectionDisplayName,
  mergeAddToWorldProposals,
  mergeToolArgFields,
} from '../merge-add-to-world-proposals'
import type { ProposedBibleSectionUpdate } from '../propose-assistant-bible-update'

const OVERVIEW = 'A salt-marsh city lit by bioluminescent kelp.'

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

describe('bibleSectionDisplayName', () => {
  it('maps wire section ids to toast labels', () => {
    expect(bibleSectionDisplayName(BibleSection.WORLD_DESCRIPTION)).toBe(
      BibleSectionDisplayName.Overview,
    )
    expect(bibleSectionDisplayName(BibleSection.EPISODE_PREMISE)).toBe(
      BibleSectionDisplayName.EpisodePremise,
    )
  })

  it('passes through an unknown section so the toast still names it', () => {
    const label = bibleSectionDisplayName('customSection')

    expect(label).toBe('customSection')
  })
})

describe('mergeToolArgFields', () => {
  it('unions bible fields across sequential tool calls', () => {
    const merged = mergeToolArgFields([
      { worldDescription: OVERVIEW },
      { factions: [{ name: 'Keepers' }] },
    ])

    expect(merged.worldDescription).toBe(OVERVIEW)
    expect(merged.factions).toEqual([{ name: 'Keepers' }])
  })

  it('ignores beat-style args that carry no bible fields', () => {
    const merged = mergeToolArgFields([
      { operation: 'create', data: { logline: 'A body ages overnight.' } },
    ])

    expect(merged).toEqual({})
  })
})

describe('mergeAddToWorldProposals pending overlay', () => {
  it('lets a pending preview replace the tool proposal for the same section', () => {
    const merged = mergeAddToWorldProposals({
      toolProposals: [proposal(BibleSection.WORLD_DESCRIPTION, { worldDescription: 'Old.' })],
      pending: {
        [BibleSection.WORLD_DESCRIPTION]: {
          section: BibleSection.WORLD_DESCRIPTION,
          preview: { worldDescription: OVERVIEW },
          action: {
            type: ActionType.UPDATE_WORLD_DESCRIPTION,
            payload: { worldDescription: OVERVIEW },
            status: ApprovalActionStatus.PENDING,
            id: 'pending-overview',
          },
        },
      },
      rejectedSections: new Set(),
    })

    expect(merged).toHaveLength(1)
    expect(merged[0]?.preview.worldDescription).toBe(OVERVIEW)
    expect(merged[0]?.dedupeKey).toBe('pending:worldDescription')
  })

  it('does not revive a rejected pending section', () => {
    const merged = mergeAddToWorldProposals({
      toolProposals: [],
      pending: {
        [BibleSection.FACTIONS]: {
          section: BibleSection.FACTIONS,
          preview: { factions: [] },
          action: {
            type: ActionType.UPDATE_FACTIONS,
            payload: {},
            status: ApprovalActionStatus.PENDING,
            id: 'pending-factions',
          },
        },
      },
      rejectedSections: new Set([BibleSection.FACTIONS]),
    })

    expect(merged).toEqual([])
  })
})

describe('addToWorldSectionLabels', () => {
  it('returns no labels for beat-only tool args', () => {
    const labels = addToWorldSectionLabels({
      toolArgs: [{ beatId: '8db804d0-1c39-498e-97a5-dfd7eb828789', prose: 'She signs.' }],
      rejectedSections: new Set(),
    })

    expect(labels).toEqual([])
  })

  it('lists Overview and Episode premise from mixed tool args', () => {
    const labels = addToWorldSectionLabels({
      toolArgs: [
        {
          worldDescription: OVERVIEW,
          episodePremise: { logline: 'The ledger writes her name first.' },
        },
      ],
      rejectedSections: new Set(),
    })

    expect(labels).toEqual([
      BibleSectionDisplayName.Overview,
      BibleSectionDisplayName.EpisodePremise,
    ])
  })

  it('lists World logic, Factions, and Characters from one write', () => {
    const labels = addToWorldSectionLabels({
      toolArgs: [
        {
          worldRules: [{ rule: 'The tide writes names.' }],
          factions: [{ name: 'Keepers', description: 'They tally.' }],
          characters: [{ name: 'Vera', description: 'She keeps the wardens at bay.' }],
        },
      ],
      rejectedSections: new Set(),
    })

    expect(labels).toEqual([
      BibleSectionDisplayName.WorldRules,
      BibleSectionDisplayName.Factions,
      BibleSectionDisplayName.Cast,
    ])
  })
})

describe('areAddToWorldSectionsSettled', () => {
  it('is true after every generated section was accepted', () => {
    const toolArgs = [{ worldRules: [{ rule: 'The tide writes names.' }] }]

    const settled = areAddToWorldSectionsSettled({
      toolArgs,
      settledSections: new Set([BibleSection.WORLD_RULES]),
    })

    expect(settled).toBe(true)
  })

  it('is false while a generated section is still open', () => {
    const settled = areAddToWorldSectionsSettled({
      toolArgs: [{ worldRules: [{ rule: 'The tide writes names.' }] }],
      settledSections: new Set(),
    })

    expect(settled).toBe(false)
  })
})
