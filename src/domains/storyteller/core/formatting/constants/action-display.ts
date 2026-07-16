import { recordFromJson, readNumber, readString } from '@/shared/data/json-guards'
import { ActionType } from '@/domains/storyteller/core/types/enums'

export const ACTION_ICON_COMMITTED = '✅'
export const ACTION_ICON_EDIT = '✏️'
export const ACTION_ICON_TRASH = '🗑️'
export const ACTION_ICON_SHUFFLE = '🔀'
export const ACTION_ICON_LOCK = '🔒'
export const ACTION_ICON_PERSON = '👤'
export const ACTION_ICON_STRESS = '📉'
export const ACTION_ICON_BRAIN = '🧠'
export const ACTION_ICON_SCROLL = '📜'
export const ACTION_ICON_PLUS = '➕'
export const ACTION_ICON_NOTE = '📝'
export const ACTION_ICON_BOOK = '📖'
export const ACTION_ICON_BULB = '💡'
export const ACTION_ICON_SCALE = '⚖️'
export const ACTION_ICON_TARGET = '🎯'
export const ACTION_ICON_LINK = '🔗'
export const ACTION_ICON_BOLT = '⚡'

export const BIBLE_TECHNICAL_PAYLOAD_KEYS = new Set([
  'projectId',
  'episodeId',
  'id',
  'traceId',
  'mergeMode',
  'currentPhase',
])

export const PREMISE_TECHNICAL_PAYLOAD_KEYS = new Set(['projectId', 'episodeId', 'id', 'traceId'])

export interface ActionDisplayCopy {
  pendingTitle: string
  committedTitle: string
  pendingIcon: string
  committedIcon: string
  describe: (payload: Record<string, unknown>) => string
}

function loglineDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload.logline) ?? ''}"`
}

function characterDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload.name) ?? ''}" - ${readString(payload.role) ?? ''}`
}

function updateCharacterDescription(payload: Record<string, unknown>): string {
  return `Modified ${Object.keys(recordFromJson(payload.updates)).length} fields`
}

function stressDescription(payload: Record<string, unknown>): string {
  const delta = readNumber(payload.delta) ?? 0
  return `Stress level ${delta > 0 ? 'increased' : 'decreased'}`
}

function knowledgeDescription(payload: Record<string, unknown>): string {
  return `Character learned: "${readString(payload.knowledge) ?? ''}"`
}

function bibleFieldCountDescription(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).filter(key => !BIBLE_TECHNICAL_PAYLOAD_KEYS.has(key))
  return `Modified ${keys.length} bible fields`
}

function premiseFieldCountDescription(payload: Record<string, unknown>): string {
  const premise = recordFromJson(payload.premise)
  const keys = Object.keys(premise).filter(key => !PREMISE_TECHNICAL_PAYLOAD_KEYS.has(key))
  return `Modified ${keys.length} premise fields`
}

function ruleDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload.rule) ?? ''}"`
}

function setupDescription(payload: Record<string, unknown>): string {
  return `"${readString(payload.description) ?? ''}"`
}

export const ACTION_DISPLAY_BY_TYPE: Partial<Record<ActionType, ActionDisplayCopy>> = {
  [ActionType.CREATE_BEAT]: {
    pendingTitle: 'Create Beat',
    committedTitle: 'Beat Created',
    pendingIcon: ACTION_ICON_NOTE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: loglineDescription,
  },
  [ActionType.UPDATE_BEAT]: {
    pendingTitle: 'Update Beat',
    committedTitle: 'Beat Updated',
    pendingIcon: ACTION_ICON_EDIT,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Beat modification',
  },
  [ActionType.DELETE_BEAT]: {
    pendingTitle: 'Delete Beat',
    committedTitle: 'Beat Deleted',
    pendingIcon: ACTION_ICON_TRASH,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Remove beat from board',
  },
  [ActionType.REORDER_BEATS]: {
    pendingTitle: 'Reorder Beats',
    committedTitle: 'Beats Reordered',
    pendingIcon: ACTION_ICON_SHUFFLE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Change beat sequence',
  },
  [ActionType.LOCK_BEAT_BOARD]: {
    pendingTitle: 'Lock Beat Board',
    committedTitle: 'Beat Board Locked',
    pendingIcon: ACTION_ICON_LOCK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Ready for writing phase',
  },
  [ActionType.CREATE_CHARACTER]: {
    pendingTitle: 'Create Character',
    committedTitle: 'Character Created',
    pendingIcon: ACTION_ICON_PERSON,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: characterDescription,
  },
  [ActionType.UPDATE_CHARACTER]: {
    pendingTitle: 'Update Character',
    committedTitle: 'Character Updated',
    pendingIcon: ACTION_ICON_EDIT,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: updateCharacterDescription,
  },
  [ActionType.UPDATE_STRESS_LEVEL]: {
    pendingTitle: 'Update Stress',
    committedTitle: 'Stress Updated',
    pendingIcon: ACTION_ICON_STRESS,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: stressDescription,
  },
  [ActionType.ADD_KNOWLEDGE]: {
    pendingTitle: 'Add Knowledge',
    committedTitle: 'Knowledge Added',
    pendingIcon: ACTION_ICON_BRAIN,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: knowledgeDescription,
  },
  [ActionType.UPDATE_SCRIPT]: {
    pendingTitle: 'Update Script',
    committedTitle: 'Script Updated',
    pendingIcon: ACTION_ICON_SCROLL,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Full script content update',
  },
  [ActionType.INSERT_SCRIPT_SECTION]: {
    pendingTitle: 'Insert Section',
    committedTitle: 'Section Inserted',
    pendingIcon: ACTION_ICON_PLUS,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'New scene added to script',
  },
  [ActionType.REVISE_SCRIPT_SECTION]: {
    pendingTitle: 'Revise Section',
    committedTitle: 'Section Revised',
    pendingIcon: ACTION_ICON_NOTE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Scene content modified',
  },
  [ActionType.UPDATE_SERIES_BIBLE]: {
    pendingTitle: 'Update Bible',
    committedTitle: 'Bible Updated',
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_WORLD_BIBLE]: {
    pendingTitle: 'Update Bible',
    committedTitle: 'Bible Updated',
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_BIBLE]: {
    pendingTitle: 'Update Bible',
    committedTitle: 'Bible Updated',
    pendingIcon: ACTION_ICON_BOOK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: bibleFieldCountDescription,
  },
  [ActionType.UPDATE_EPISODE_PREMISE]: {
    pendingTitle: 'Update Premise',
    committedTitle: 'Premise Updated',
    pendingIcon: ACTION_ICON_BULB,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: premiseFieldCountDescription,
  },
  [ActionType.ADD_WORLD_RULE]: {
    pendingTitle: 'Add World Rule',
    committedTitle: 'Rule Added',
    pendingIcon: ACTION_ICON_SCALE,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: ruleDescription,
  },
  [ActionType.ADD_SETUP]: {
    pendingTitle: 'Add Setup',
    committedTitle: 'Setup Added',
    pendingIcon: ACTION_ICON_TARGET,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: setupDescription,
  },
  [ActionType.RESOLVE_SETUP]: {
    pendingTitle: 'Resolve Setup',
    committedTitle: 'Setup Resolved',
    pendingIcon: ACTION_ICON_LINK,
    committedIcon: ACTION_ICON_COMMITTED,
    describe: () => 'Payoff linking complete',
  },
}

export const ACTION_DISPLAY_FALLBACK: ActionDisplayCopy = {
  pendingTitle: 'Execute Action',
  committedTitle: 'Action Executed',
  pendingIcon: ACTION_ICON_BOLT,
  committedIcon: ACTION_ICON_COMMITTED,
  describe: payload => readString(payload.type) ?? 'Action',
}
