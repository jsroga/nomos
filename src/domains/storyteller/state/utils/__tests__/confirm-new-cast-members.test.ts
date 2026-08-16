import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccess },
}))

import { ActionType } from '@/domains/storyteller/core/types/enums'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { CharacterRole } from '@/shared/data/constants/protocol'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import {
  newCastDescription,
  WritersRoomCastConfirm,
  WritersRoomToast,
} from '@/domains/storyteller/ui/StorytellerLayout/constants/writers-room-copy'
import {
  ConfirmNewCastOutcome,
  confirmNewCastMembers,
} from '../confirm-new-cast-members'

const VERA_LOGLINE = 'Vera confronts Marcus in the salt marsh.'

describe('confirmNewCastMembers', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
  })

  it('skips the dialog when every named character is already in cast', async () => {
    const confirm = vi.fn()
    const executeAction = vi.fn()

    const outcome = await confirmNewCastMembers({
      payload: {
        beatPayloads: [{ logline: VERA_LOGLINE, charactersInvolved: ['Vera'] }],
      },
      characters: [{ name: 'Vera' }],
      storyPlan: {},
      executeAction,
      confirm,
    })

    expect(outcome).toBe(ConfirmNewCastOutcome.Skipped)
    expect(confirm).not.toHaveBeenCalled()
    expect(executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('lists only new names in the confirm copy', async () => {
    const confirm = vi.fn().mockResolvedValue(false)

    await confirmNewCastMembers({
      payload: {
        beatPayloads: [
          { logline: VERA_LOGLINE, charactersInvolved: ['Vera', 'Lina'] },
        ],
      },
      characters: [{ name: 'Vera' }],
      storyPlan: {},
      executeAction: vi.fn(),
      confirm,
    })

    expect(confirm).toHaveBeenCalledWith({
      title: WritersRoomCastConfirm.Title,
      description: newCastDescription(['Lina']),
      confirmLabel: WritersRoomCastConfirm.Confirm,
      cancelLabel: WritersRoomCastConfirm.Cancel,
    })
  })

  it('does not write or toast when the user skips', async () => {
    const executeAction = vi.fn()

    const outcome = await confirmNewCastMembers({
      payload: {
        beatPayloads: [{ logline: VERA_LOGLINE, charactersInvolved: ['Lina'] }],
      },
      characters: [],
      storyPlan: {},
      executeAction,
      confirm: vi.fn().mockResolvedValue(false),
    })

    expect(outcome).toBe(ConfirmNewCastOutcome.Cancelled)
    expect(executeAction).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('commits supporting additions and toasts CastAdded', async () => {
    const executeAction = vi.fn().mockResolvedValue(undefined)

    const outcome = await confirmNewCastMembers({
      payload: {
        beatPayloads: [{ logline: VERA_LOGLINE, charactersInvolved: ['Lina'] }],
      },
      characters: [{ name: 'Vera', role: CharacterRole.Lead }],
      storyPlan: {},
      executeAction,
      confirm: vi.fn().mockResolvedValue(true),
    })

    expect(outcome).toBe(ConfirmNewCastOutcome.Added)
    expect(executeAction).toHaveBeenCalledOnce()
    const action = executeAction.mock.calls[0]?.[0]
    expect(action?.type).toBe(ActionType.UPDATE_CAST)
    expect(action?.status).toBe(ApprovalActionStatus.COMMITTED)
    const cast = recordArrayFromJson(recordFromJson(action?.payload)[CastFieldAlias.Cast])
    expect(readString(cast[0]?.name)).toBe('Vera')
    expect(readString(cast[1]?.name)).toBe('Lina')
    expect(readString(cast[1]?.role)).toBe(CharacterRole.Supporting)
    expect(toastSuccess).toHaveBeenCalledWith(WritersRoomToast.CastAdded)
  })

  it('skips when the beat names nobody', async () => {
    const outcome = await confirmNewCastMembers({
      payload: { beatPayloads: [{ logline: VERA_LOGLINE }] },
      characters: [],
      storyPlan: {},
      executeAction: vi.fn(),
      confirm: vi.fn(),
    })

    expect(outcome).toBe(ConfirmNewCastOutcome.Skipped)
  })
})
