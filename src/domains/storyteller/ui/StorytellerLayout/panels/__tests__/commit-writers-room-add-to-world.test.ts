import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, message: vi.fn() },
}))

import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import { StorytellerTab } from '@/domains/storyteller/core/storyteller-page-wire'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { BibleSectionDisplayName } from '@/domains/storyteller/state/utils/merge-add-to-world-proposals'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import { WritersRoomConfirm, WritersRoomToast } from '../../constants/writers-room-copy'
import {
  commitWritersRoomAddToWorld,
  type CommitWritersRoomAddToWorldInput,
} from '../writers-room-add-to-world'
import { ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { CharacterDraftChatSection } from '@/domains/storyteller/state/constants/storyteller-ui-store'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'

const EPISODE_ID = '8db804d0-1c39-498e-97a5-dfd7eb828789'
const OVERVIEW = 'A salt-marsh city lit by bioluminescent kelp.'
const FACTION_NAME = 'Keepers'
const LOGLINE_A = 'A body ages overnight.'
const LOGLINE_B = 'She opens the ledger.'
const PREMISE = {
  logline: 'A clerk discovers the ledger writes her name in advance.',
}

function commitInput(
  overrides: Partial<CommitWritersRoomAddToWorldInput> = {},
): CommitWritersRoomAddToWorldInput {
  return {
    payload: { text: '', toolArgs: [] },
    currentEpisodeId: EPISODE_ID,
    answeredSection: undefined,
    requestedPremiseField: undefined,
    sectionPendingActions: {},
    rejectedSections: new Set(),
    lastPreview: {},
    storyPlan: {},
    confirm: vi.fn().mockResolvedValue(true),
    confirmNewCastMembers: vi.fn().mockResolvedValue(undefined),
    executeAction: vi.fn().mockResolvedValue(undefined),
    setActiveTab: vi.fn(),
    closeBible: vi.fn(),
    refreshBeats: vi.fn().mockResolvedValue(undefined),
    setStoryPlan: vi.fn(),
    setLoadingSections: vi.fn(),
    setSectionPendingActions: vi.fn(),
    ...overrides,
  }
}

describe('commitWritersRoomAddToWorld', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    getStorytellerUiStore().setPendingBoardHydration(false)
    getStorytellerUiStore().clearPendingBeatAdds(false)
    const store = getStorytellerUiStore()
    if (store.characterDraftFieldsSeq > store.characterDraftResolvedSeq) {
      store.rejectCharacterDraftFields()
    }
  })

  it('commits each beat create, hydrates the board, and toasts once', async () => {
    const executeAction = vi.fn().mockImplementation(async () => {
      expect(getStorytellerUiStore().pendingBoardHydration).toBe(true)
    })
    const input = commitInput({
      executeAction,
      payload: {
        text: 'Board ready.',
        toolArgs: [
          {
            operation: ManageToolOperation.Create,
            data: { logline: LOGLINE_A, charactersInvolved: ['Vera'] },
          },
          {
            operation: ManageToolOperation.Create,
            data: { logline: LOGLINE_B },
          },
        ],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(executeAction).toHaveBeenCalledTimes(2)
    expect(executeAction.mock.calls[0]?.[0]?.type).toBe(ActionType.CREATE_BEAT)
    expect(executeAction.mock.calls[0]?.[0]?.status).toBe(ApprovalActionStatus.COMMITTED)
    expect(input.setActiveTab).toHaveBeenCalledWith(StorytellerTab.Board)
    expect(input.closeBible).toHaveBeenCalled()
    expect(input.refreshBeats).toHaveBeenCalledWith(EPISODE_ID)
    expect(input.confirmNewCastMembers).toHaveBeenCalledWith({
      beatPayloads: expect.arrayContaining([
        expect.objectContaining({ logline: LOGLINE_A }),
      ]),
    })
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.BeatOnBoard)
    expect(getStorytellerUiStore().beatAddsCommitted).toBe(true)
    expect(getStorytellerUiStore().pendingBeatAdds).toEqual([])
  })

  it('does not dump beat creates into Overview when no episode is selected', async () => {
    const input = commitInput({
      currentEpisodeId: null,
      payload: {
        text: 'Beat draft ready. Add it to Overview?',
        toolArgs: [
          {
            operation: ManageToolOperation.Create,
            data: { logline: LOGLINE_A },
          },
        ],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(false)
    expect(input.executeAction).toHaveBeenCalledTimes(1)
    expect(input.setActiveTab).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.NoBibleUpdates)
  })

  it('toasts Added to world when fallback finds nothing to write', async () => {
    const input = commitInput({
      payload: { text: '', toolArgs: [] },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.AddedToWorld)
  })

  it('toasts Already in world when the preview matches the plan', async () => {
    const input = commitInput({
      storyPlan: { worldDescription: OVERVIEW },
      payload: {
        text: '',
        toolArgs: [{ worldDescription: OVERVIEW }],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.AlreadyInWorld)
  })

  it('toasts each bible section as it is committed', async () => {
    const input = commitInput({
      payload: {
        text: '',
        toolArgs: [
          {
            worldDescription: OVERVIEW,
            factions: [{ name: FACTION_NAME, description: 'They tally.' }],
          },
        ],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: WritersRoomConfirm.AddToWorldTitle,
        confirmLabel: WritersRoomConfirm.AddToWorldConfirm,
      }),
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      `${WritersRoomToast.SectionAddedPrefix}${BibleSectionDisplayName.Overview}`,
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      `${WritersRoomToast.SectionAddedPrefix}${BibleSectionDisplayName.Factions}`,
    )
    expect(input.executeAction).toHaveBeenCalledTimes(2)
  })

  it('stops without toasts when the multi-section confirm is cancelled', async () => {
    const input = commitInput({
      confirm: vi.fn().mockResolvedValue(false),
      payload: {
        text: '',
        toolArgs: [
          {
            worldDescription: OVERVIEW,
            factions: [{ name: FACTION_NAME, description: 'They tally.' }],
          },
        ],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(false)
    expect(input.executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('opens the plan tab when committing episode premise', async () => {
    const input = commitInput({
      payload: {
        text: '',
        toolArgs: [{ episodePremise: PREMISE }],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.setActiveTab).toHaveBeenCalledWith(StorytellerTab.Plan)
    expect(input.closeBible).toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(
      `${WritersRoomToast.SectionAddedPrefix}${BibleSectionDisplayName.EpisodePremise}`,
    )
  })

  it('clears committed sections from pending actions', async () => {
    const input = commitInput({
      payload: {
        text: '',
        toolArgs: [{ worldDescription: OVERVIEW }],
      },
    })

    await commitWritersRoomAddToWorld(input)

    const updater = vi.mocked(input.setSectionPendingActions).mock.calls[0]?.[0]
    expect(typeof updater).toBe('function')
    if (typeof updater !== 'function') return
    expect(
      updater({
        [BibleSection.WORLD_DESCRIPTION]: {
          section: BibleSection.WORLD_DESCRIPTION,
          preview: { worldDescription: OVERVIEW },
          action: {
            type: ActionType.UPDATE_WORLD_DESCRIPTION,
            payload: {},
            status: ApprovalActionStatus.PENDING,
            id: 'pending-overview',
          },
          onAccept: () => undefined,
          onReject: () => undefined,
        },
      }),
    ).toEqual({})
  })

  it('skips a rejected section and still toasts the kept one', async () => {
    const input = commitInput({
      rejectedSections: new Set([BibleSection.FACTIONS]),
      payload: {
        text: '',
        toolArgs: [
          {
            worldDescription: OVERVIEW,
            factions: [{ name: FACTION_NAME, description: 'They tally.' }],
          },
        ],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.confirm).not.toHaveBeenCalled()
    expect(input.executeAction).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith(
      `${WritersRoomToast.SectionAddedPrefix}${BibleSectionDisplayName.Overview}`,
    )
  })

  it('asks the cast confirm after bible sections land', async () => {
    const input = commitInput({
      payload: {
        text: '',
        toolArgs: [{ worldDescription: OVERVIEW }],
      },
    })

    await commitWritersRoomAddToWorld(input)

    expect(input.confirmNewCastMembers).toHaveBeenCalledWith({
      previews: [expect.objectContaining({ worldDescription: OVERVIEW })],
    })
  })

  it('falls back to cleaned chat Overview when tool args have no bible fields', async () => {
    const input = commitInput({
      payload: {
        text: OVERVIEW,
        toolArgs: [],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.executeAction).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith(
      `${WritersRoomToast.SectionAddedPrefix}${BibleSectionDisplayName.Overview}`,
    )
  })

  it('does not write chat text to Overview on a character-form turn', async () => {
    const input = commitInput({
      answeredSection: CharacterDraftChatSection.Form,
      payload: {
        text: OVERVIEW,
        toolArgs: [],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(false)
    expect(input.executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.NoCharacterForm)
  })

  it('applies character-form fields from Add to World', async () => {
    const store = getStorytellerUiStore()
    store.notifyCharacterDraftFields({
      [CharacterTextFieldKey.Motivation]: 'Protect the wardens.',
    })
    const seq = getStorytellerUiStore().characterDraftFieldsSeq
    const input = commitInput({
      answeredSection: CharacterDraftChatSection.Form,
      payload: {
        text: '',
        toolArgs: [{ [CharacterTextFieldKey.Motivation]: 'Protect the wardens.' }],
      },
    })

    const committed = await commitWritersRoomAddToWorld(input)

    expect(committed).toBe(true)
    expect(input.executeAction).not.toHaveBeenCalled()
    expect(getStorytellerUiStore().characterDraftResolvedSeq).toBe(seq)
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.CharacterForm)
  })
})
