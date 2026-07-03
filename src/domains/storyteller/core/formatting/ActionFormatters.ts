import { AgentAction } from '@/domains/storyteller/core/types/ActionTypes'

// Helper to format action for display
// status: 'pending' = awaiting approval, 'committed' = already approved
export function formatActionForDisplay(
  action: AgentAction,
  status: 'pending' | 'committed' = 'pending'
): {
  title: string
  description: string
  icon: string
} {
  const isPending = status === 'pending'

  switch (action.type) {
    // Beat Operations
    case 'CREATE_BEAT':
      return {
        title: isPending ? 'Create Beat' : 'Beat Created',
        description: `"${action.payload.logline}"`,
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
        description: `"${action.payload.name}" - ${action.payload.role}`,
        icon: isPending ? '👤' : '✅',
      }
    case 'UPDATE_CHARACTER':
      return {
        title: isPending ? 'Update Character' : 'Character Updated',
        description: `Modified ${Object.keys(action.payload.updates).length} fields`,
        icon: isPending ? '✏️' : '✅',
      }
    case 'UPDATE_STRESS_LEVEL':
      return {
        title: isPending ? 'Update Stress' : 'Stress Updated',
        description: `Stress level ${action.payload.delta > 0 ? 'increased' : 'decreased'}`,
        icon: isPending ? '📉' : '✅',
      }
    case 'ADD_KNOWLEDGE':
      return {
        title: isPending ? 'Add Knowledge' : 'Knowledge Added',
        description: `Character learned: "${action.payload.knowledge}"`,
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
      const payload = (action.payload || {}) as any

      // Try to find the actual updates object (sometimes it's nested)
      let updates = payload
      if (
        payload.updates &&
        typeof payload.updates === 'object' &&
        !Array.isArray(payload.updates)
      ) {
        updates = payload.updates
      } else if (
        payload.premise &&
        typeof payload.premise === 'object' &&
        !Array.isArray(payload.premise)
      ) {
        updates = payload.premise
      } else if (
        payload.bible &&
        typeof payload.bible === 'object' &&
        !Array.isArray(payload.bible)
      ) {
        updates = payload.bible
      } else if (
        payload.updatedFields &&
        typeof payload.updatedFields === 'object' &&
        !Array.isArray(payload.updatedFields)
      ) {
        updates = payload.updatedFields
      }

      // Filter out technical keys from count
      const technicalKeys = ['projectId', 'episodeId', 'id', 'traceId', 'mergeMode', 'currentPhase']
      const keys = Object.keys(updates).filter(k => !technicalKeys.includes(k))

      return {
        title: isPending ? 'Update Bible' : 'Bible Updated',
        description: `Modified ${keys.length} bible fields`,
        icon: isPending ? '📖' : '✅',
      }
    }
    case 'UPDATE_EPISODE_PREMISE': {
      const payload = (action.payload || {}) as any
      const updates = payload.premise || payload.updates || payload
      const technicalKeys = ['projectId', 'episodeId', 'id', 'traceId']
      const keys = Object.keys(updates).filter(
        k => typeof updates[k] !== 'undefined' && !technicalKeys.includes(k)
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
        description: `"${action.payload.rule}"`,
        icon: isPending ? '⚖️' : '✅',
      }

    // Setup/Payoff
    case 'ADD_SETUP':
      return {
        title: isPending ? 'Add Setup' : 'Setup Added',
        description: `"${action.payload.description}"`,
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
