import { describe, expect, it } from 'vitest'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'
import type { PendingAction } from '../bible-context-types'
import { pendingActionForCurrentEpisode } from '../pending-action-for-episode'

const EPISODE_A = '8db804d0-1c39-498e-97a5-dfd7eb828789'
const EPISODE_B = '0696e553-d361-4a36-a839-fb9c5e570e75'

function pending(episodeId?: string): PendingAction {
  return {
    section: BibleSection.EPISODE_PREMISE,
    preview: { premise: { logline: 'Draft.' } },
    action: {
      type: ActionType.UPDATE_EPISODE_PREMISE,
      payload: { episodeId, premise: { logline: 'Draft.' } },
      status: ApprovalActionStatus.PENDING,
      id: 'pending',
    },
    onAccept: () => undefined,
    onReject: () => undefined,
    episodeId,
  }
}

describe('pendingActionForCurrentEpisode', () => {
  it('hides a premise overlay that belongs to another episode', () => {
    expect(pendingActionForCurrentEpisode(pending(EPISODE_A), EPISODE_B)).toBeUndefined()
  })

  it('shows a premise overlay for the current episode', () => {
    const action = pending(EPISODE_A)
    expect(pendingActionForCurrentEpisode(action, EPISODE_A)).toBe(action)
  })

  it('shows bible overlays that are not episode-scoped', () => {
    const action = pending()
    expect(pendingActionForCurrentEpisode(action, EPISODE_B)).toBe(action)
  })
})
