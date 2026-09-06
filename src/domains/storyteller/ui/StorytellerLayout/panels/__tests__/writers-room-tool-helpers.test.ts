import { describe, expect, it, vi } from 'vitest'
import { recordFromJson } from '@/shared/data/json-guards'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import {
  extraPendingSectionsMessage,
  chatFallbackAddToWorldTargets,
  createBeatCommitActions,
  isBeatCreateToolArgs,
  isSuccessfulBeatWrite,
  pendingBeatArgsFromToolCalls,
  shouldShowAddToWorld,
  showBeatOnBoard,
} from '../writers-room-tool-helpers'
import { CharacterDraftChatSection, StorytellerChatTool, StorytellerTab, StorytellerWorkflowToolId } from '@/domains/storyteller/core/storyteller-page-wire'
import { ChatMessageRole } from '@/shared/chat/core/constants/assistant-thread-ui'
import { BibleSectionDisplayName, SectionListJoin } from '@/domains/storyteller/state/utils/merge-add-to-world-proposals'
import { WritersRoomToast } from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import type { ProposedBibleSectionUpdate } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'

function proposal(section: BibleSection): ProposedBibleSectionUpdate {
  return {
    section,
    preview: {},
    dedupeKey: section,
    action: {
      type: ActionType.UPDATE_SERIES_BIBLE,
      payload: {},
      status: ApprovalActionStatus.PENDING,
      id: section,
    },
  }
}

describe('extraPendingSectionsMessage', () => {
  it('lists extras after the focused proposal', () => {
    expect(
      extraPendingSectionsMessage([
        proposal(BibleSection.WORLD_DESCRIPTION),
        proposal(BibleSection.FACTIONS),
        proposal(BibleSection.EPISODE_PREMISE),
      ]),
    ).toBe(
      `${WritersRoomToast.PendingExtrasPrefix}${[
        BibleSectionDisplayName.Factions,
        BibleSectionDisplayName.EpisodePremise,
      ].join(SectionListJoin.CommaSpace)}`,
    )
  })

  it('returns null for a single-section write', () => {
    expect(extraPendingSectionsMessage([proposal(BibleSection.WORLD_DESCRIPTION)])).toBeNull()
  })
})

describe('chatFallbackAddToWorldTargets', () => {
  it('skips beat-style tool args so chat is not dumped into Overview', () => {
    expect(
      chatFallbackAddToWorldTargets({
        toolArgs: [{ beatId: '8db804d0-1c39-498e-97a5-dfd7eb828789', prose: 'She signs.' }],
        pending: {},
        lastPreview: {},
        chatText: 'Beat draft ready. Add it to Overview?',
      }),
    ).toBeNull()
  })
})

describe('isBeatCreateToolArgs', () => {
  it('detects manage_beat create payloads', () => {
    expect(
      isBeatCreateToolArgs([
        {
          operation: 'create',
          sequence: 2,
          data: { logline: 'A body ages overnight.' },
        },
      ]),
    ).toBe(true)
  })

  it('ignores list/get payloads', () => {
    expect(isBeatCreateToolArgs([{ operation: 'list', episodeId: 'ep-1' }])).toBe(false)
  })
})

describe('createBeatCommitActions', () => {
  it('maps create args to committed CREATE_BEAT actions', () => {
    const actions = createBeatCommitActions([
      {
        operation: 'create',
        data: {
          logline: 'A body ages overnight.',
          actionTaken: 'She opens the ledger.',
          consequence: 'The year is blank.',
          storyStateChange: 'Time is no longer honest.',
        },
      },
      { operation: 'list', episodeId: 'ep-1' },
    ])
    expect(actions).toHaveLength(1)
    expect(actions[0]?.type).toBe(ActionType.CREATE_BEAT)
    expect(actions[0]?.status).toBe(ApprovalActionStatus.COMMITTED)
    expect(recordFromJson(actions[0]?.payload).logline).toBe('A body ages overnight.')
  })
})

describe('isSuccessfulBeatWrite', () => {
  it('requires a successful manage_beat result with a beat', () => {
    expect(
      isSuccessfulBeatWrite({
        toolName: StorytellerChatTool.ManageBeat,
        args: {},
        result: { success: true, beat: { id: 'b2', logline: 'A body ages overnight.' } },
      }),
    ).toBe(true)
    expect(
      isSuccessfulBeatWrite({
        toolName: StorytellerChatTool.ManageBeat,
        args: {},
        result: { success: true, beats: [], count: 1 },
      }),
    ).toBe(false)
  })
})

describe('pendingBeatArgsFromToolCalls', () => {
  it('keeps args from successful manage_beat creates', () => {
    const created = {
      operation: 'create',
      data: { logline: 'A body ages overnight.' },
    }
    expect(
      pendingBeatArgsFromToolCalls([
        {
          toolName: StorytellerChatTool.ManageBeat,
          args: created,
          result: { success: true, beat: { id: 'b2', logline: 'A body ages overnight.' } },
        },
        {
          toolName: StorytellerChatTool.ManageBeat,
          args: { operation: 'list', episodeId: 'ep-1' },
          result: { success: true, beats: [] },
        },
      ]),
    ).toEqual([created])
  })
})

describe('showBeatOnBoard', () => {
  it('opens the board and refreshes beats', () => {
    const setActiveTab = vi.fn()
    const closeBible = vi.fn()
    const refreshBeats = vi.fn()
    expect(
      showBeatOnBoard({
        episodeId: 'ep-1',
        setActiveTab,
        closeBible,
        refreshBeats,
      }),
    ).toBe(true)
    expect(setActiveTab).toHaveBeenCalledWith(StorytellerTab.Board)
    expect(closeBible).toHaveBeenCalled()
    expect(refreshBeats).toHaveBeenCalledWith('ep-1')
  })
})

describe('shouldShowAddToWorld', () => {
  const factionsArgs = [
    { factions: [{ name: 'Keepers', description: 'Wardens of the marsh.' }] },
  ]

  it('hides the button for user role, bible writes on a character-form turn, and empty tools', () => {
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.User,
        toolNames: [StorytellerChatTool.UpdateWorldBible],
        toolArgs: factionsArgs,
      }),
    ).toBe(false)
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.Assistant,
        requestedSection: CharacterDraftChatSection.Form,
        toolNames: [StorytellerChatTool.UpdateWorldBible],
        toolArgs: factionsArgs,
      }),
    ).toBe(false)
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.Assistant,
        toolNames: [],
        toolArgs: [],
      }),
    ).toBe(false)
  })

  it('shows the button after propose_character_fields', () => {
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.Assistant,
        requestedSection: CharacterDraftChatSection.Form,
        toolNames: [StorytellerChatTool.ProposeCharacterFields],
        toolArgs: [{ name: 'Vera', description: 'A warden.' }],
      }),
    ).toBe(true)
  })

  it('shows the button for a successful bible factions write', () => {
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.Assistant,
        toolNames: [StorytellerChatTool.UpdateWorldBible],
        toolArgs: factionsArgs,
      }),
    ).toBe(true)
  })

  it('hides the button after a failed or unavailable beat-draft workflow call', () => {
    expect(
      shouldShowAddToWorld({
        role: ChatMessageRole.Assistant,
        toolNames: [StorytellerWorkflowToolId.RunBeatDraft],
        toolArgs: [{ projectId: 'p1', episodeId: 'e1', brief: 'Draft the next beat.' }],
      }),
    ).toBe(false)
  })
})
