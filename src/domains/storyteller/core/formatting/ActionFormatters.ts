import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'

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

  switch (action.type) {
    // Beat Operations
    case 'CREATE_BEAT':
      return {
        title: isPending ? 'Create Beat' : 'Beat Created',
        description: `"${readString(payload.logline) ?? ''}"`,
        icon: isPending ? '📝' : '✅',
      }
    case 'UPDATE_BEAT':
      return {
        title: isPending ? 'Update Beat' : 'Beat Updated',
        description: 'Beat modification',
        icon: isPending ? '✏️' : '✅',
      }
    case 'DELETE_BEAT':
      return {
        title: isPending ? 'Delete Beat' : 'Beat Deleted',
        description: 'Remove beat from board',
        icon: isPending ? '🗑️' : '✅',
      }
    case 'REORDER_BEATS':
      return {
        title: isPending ? 'Reorder Beats' : 'Beats Reordered',
        description: 'Change beat sequence',
        icon: isPending ? '🔀' : '✅',
      }
    case 'LOCK_BEAT_BOARD':
      return {
        title: isPending ? 'Lock Beat Board' : 'Beat Board Locked',
        description: 'Ready for writing phase',
        icon: isPending ? '🔒' : '✅',
      }

    // Character Operations
    case 'CREATE_CHARACTER':
      return {
        title: isPending ? 'Create Character' : 'Character Created',
        description: `"${readString(payload.name) ?? ''}" - ${readString(payload.role) ?? ''}`,
        icon: isPending ? '👤' : '✅',
      }
    case 'UPDATE_CHARACTER':
      return {
        title: isPending ? 'Update Character' : 'Character Updated',
        description: `Modified ${Object.keys(recordFromJson(payload.updates)).length} fields`,
        icon: isPending ? '✏️' : '✅',
      }
    case 'UPDATE_STRESS_LEVEL':
      return {
        title: isPending ? 'Update Stress' : 'Stress Updated',
        description: `Stress level ${(readNumber(payload.delta) ?? 0) > 0 ? 'increased' : 'decreased'}`,
        icon: isPending ? '📉' : '✅',
      }
    case 'ADD_KNOWLEDGE':
      return {
        title: isPending ? 'Add Knowledge' : 'Knowledge Added',
        description: `Character learned: "${readString(payload.knowledge) ?? ''}"`,
        icon: isPending ? '🧠' : '✅',
      }

    // Script Operations
    case 'UPDATE_SCRIPT':
      return {
        title: isPending ? 'Update Script' : 'Script Updated',
        description: 'Full script content update',
        icon: isPending ? '📜' : '✅',
      }
    case 'INSERT_SCRIPT_SECTION':
      return {
        title: isPending ? 'Insert Section' : 'Section Inserted',
        description: 'New scene added to script',
        icon: isPending ? '➕' : '✅',
      }
    case 'REVISE_SCRIPT_SECTION':
      return {
        title: isPending ? 'Revise Section' : 'Section Revised',
        description: 'Scene content modified',
        icon: isPending ? '📝' : '✅',
      }

    // Series Bible Operations
    case 'UPDATE_SERIES_BIBLE':
    case 'UPDATE_WORLD_BIBLE':
    case 'UPDATE_BIBLE': {
      const technicalKeys = new Set([
        'projectId',
        'episodeId',
        'id',
        'traceId',
        'mergeMode',
        'currentPhase',
      ])
      const keys = Object.keys(payload).filter(k => !technicalKeys.has(k))

      return {
        title: isPending ? 'Update Bible' : 'Bible Updated',
        description: `Modified ${keys.length} bible fields`,
        icon: isPending ? '📖' : '✅',
      }
    }
    case 'UPDATE_EPISODE_PREMISE': {
      const technicalKeys = new Set(['projectId', 'episodeId', 'id', 'traceId'])
      const keys = Object.keys(recordFromJson(payload.premise)).filter(
        k => !technicalKeys.has(k)
      )

      return {
        title: isPending ? 'Update Premise' : 'Premise Updated',
        description: `Modified ${keys.length} premise fields`,
        icon: isPending ? '💡' : '✅',
      }
    }
    case 'ADD_WORLD_RULE':
      return {
        title: isPending ? 'Add World Rule' : 'Rule Added',
        description: `"${readString(payload.rule) ?? ''}"`,
        icon: isPending ? '⚖️' : '✅',
      }

    // Setup/Payoff
    case 'ADD_SETUP':
      return {
        title: isPending ? 'Add Setup' : 'Setup Added',
        description: `"${readString(payload.description) ?? ''}"`,
        icon: isPending ? '🎯' : '✅',
      }
    case 'RESOLVE_SETUP':
      return {
        title: isPending ? 'Resolve Setup' : 'Setup Resolved',
        description: 'Payoff linking complete',
        icon: isPending ? '🔗' : '✅',
      }

    default:
      return {
        title: isPending ? 'Execute Action' : 'Action Executed',
        description: action.type,
        icon: isPending ? '⚡' : '✅',
      }
  }
}
