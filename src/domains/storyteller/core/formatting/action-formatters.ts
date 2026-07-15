import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { recordFromJson } from '@/shared/data/json-guards'
import { isActionType } from '@/domains/storyteller/core/types/Enums'
import {
  ACTION_DISPLAY_BY_TYPE,
  ACTION_DISPLAY_FALLBACK,
} from '@/domains/storyteller/core/formatting/constants/action-display'

/** Display wording for approval UI vs committed history — subset of wire approval status. */
export type ActionDisplayStatus =
  | ApprovalActionStatus.PENDING
  | ApprovalActionStatus.COMMITTED

/**
 * Human-readable title/description/icon for an action toast or history entry.
 * Accepts the open wire shape (history/stream actions carry untyped payloads);
 * payload fields are narrowed defensively per action type.
 */
export function formatActionForDisplay(
  action: Pick<WireAgentAction, 'type' | 'payload'>,
  status: ActionDisplayStatus = ApprovalActionStatus.PENDING
): {
  title: string
  description: string
  icon: string
} {
  const isPending = status === ApprovalActionStatus.PENDING
  const payload = recordFromJson(action.payload)
  const copy = isActionType(action.type)
    ? ACTION_DISPLAY_BY_TYPE[action.type]
    : undefined
  const row = copy ?? ACTION_DISPLAY_FALLBACK
  const description =
    copy === undefined && !isActionType(action.type)
      ? action.type
      : row.describe(payload)

  return {
    title: isPending ? row.pendingTitle : row.committedTitle,
    description,
    icon: isPending ? row.pendingIcon : row.committedIcon,
  }
}
