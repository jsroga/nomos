import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import {
  ACTION_DATA_LABEL,
  ACTION_PREFIX_CREATE,
  ACTION_PREFIX_DELETE,
  ACTION_PREFIX_UPDATE,
  ActionChangeType,
  ARRAY_ITEM_FRIENDLY_KEYS,
  ARRAY_ITEM_LABEL_KEYS,
  ENTITY_CATEGORY_CHARACTERS,
  ENTITY_CATEGORY_GENERAL,
  ENTITY_CATEGORY_ROADMAP,
  ENTITY_CATEGORY_STORY,
  EPISODE_ROADMAP_FIELD,
  EPISODE_TITLE_KEYS,
  EPISODES_FIELD,
  EXPANDABLE_ARRAY_FIELD_KEY_SET,
  FIELD_CATEGORIES,
  FRIENDLY_FIELD_NAMES,
  NEW_EPISODE_LABEL,
  NEW_ITEM_LABEL,
  PAYLOAD_PATH,
  SEASON_STRUCTURE_FIELD,
  SEASON_STRUCTURE_LABEL,
  SUMMARY_ITEM_LABEL,
  SUMMARY_ITEM_TYPE,
  SUMMARY_TABLE_FIELD_KEY_SET,
  SUMMARY_VERB,
  ENTITY_TYPE,
  ARRAY_ITEM_FALLBACK_KEY,
  TECHNICAL_PAYLOAD_KEYS,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { formatFieldName } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'

function firstStringField(record: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value) return value
  }
  return undefined
}

function summaryItemType(key: string): string {
  switch (key) {
    case SUMMARY_ITEM_TYPE.CHARACTERS:
    case SUMMARY_ITEM_TYPE.KEY_CHARACTERS:
      return SUMMARY_ITEM_LABEL.CHARACTER
    case SUMMARY_ITEM_TYPE.WORLD_RULES:
      return SUMMARY_ITEM_LABEL.RULE
    case SUMMARY_ITEM_TYPE.FACTIONS:
      return SUMMARY_ITEM_LABEL.FACTION
    case SUMMARY_ITEM_TYPE.THEMES:
      return SUMMARY_ITEM_LABEL.THEME
    case SUMMARY_ITEM_TYPE.TRAITS:
      return SUMMARY_ITEM_LABEL.TRAIT
    case SUMMARY_ITEM_TYPE.SOUNDTRACKS:
      return SUMMARY_ITEM_LABEL.TRACK
    case SUMMARY_ITEM_TYPE.PLOT_TWISTS:
      return SUMMARY_ITEM_LABEL.TWIST
    case SUMMARY_ITEM_TYPE.SEQUENCES:
    case SUMMARY_ITEM_TYPE.EPISODE_ROADMAP:
      return SUMMARY_ITEM_LABEL.EPISODE
    default:
      return SUMMARY_ITEM_LABEL.ITEM
  }
}

function generateSummary(actionType: string, key: string, value: unknown): string | undefined {
  if (Array.isArray(value)) {
    if (SUMMARY_TABLE_FIELD_KEY_SET.has(key)) {
      return undefined
    }
    const count = value.length
    const itemType = summaryItemType(key)
    const verb = actionType.startsWith(ACTION_PREFIX_CREATE)
      ? SUMMARY_VERB.ADDED
      : SUMMARY_VERB.UPDATED
    return `${count} ${itemType}${count !== 1 ? 's' : ''} ${verb}`
  }
  if (typeof value === 'string' && value.length > 100) {
    return `${value.slice(0, 100)}...`
  }
  return undefined
}

function entityCategory(entityType: string): string {
  if (entityType === ENTITY_TYPE.BEAT) return ENTITY_CATEGORY_STORY
  if (entityType === ENTITY_TYPE.CHARACTER) return ENTITY_CATEGORY_CHARACTERS
  return ENTITY_CATEGORY_GENERAL
}

function pushArrayItemChanges(
  changes: ActionChange[],
  key: string,
  value: unknown[],
  action: WireAgentAction
): void {
  value.forEach(item => {
    const itemRecord = recordFromJson(item)
    const itemLabel = firstStringField(itemRecord, ARRAY_ITEM_LABEL_KEYS)
    changes.push({
      path: `${key}[${itemLabel || ARRAY_ITEM_FALLBACK_KEY}]`,
      before: null,
      after: item,
      reason: action.reasoning,
      changeType: ActionChangeType.ADD,
      category: FIELD_CATEGORIES[key] || ENTITY_CATEGORY_GENERAL,
      friendlyName:
        firstStringField(itemRecord, ARRAY_ITEM_FRIENDLY_KEYS) || NEW_ITEM_LABEL,
      summary: undefined,
    })
  })
}

function pushEpisodeRoadmapChanges(
  changes: ActionChange[],
  value: unknown,
  action: WireAgentAction
): void {
  const roadmap = recordFromJson(value)
  if (Array.isArray(roadmap.episodes)) {
    roadmap.episodes.forEach(episode => {
      const episodeRecord = recordFromJson(episode)
      const episodeTitle = firstStringField(episodeRecord, EPISODE_TITLE_KEYS)
      changes.push({
        path: `${EPISODE_ROADMAP_FIELD}.${EPISODES_FIELD}[${episodeTitle || ARRAY_ITEM_FALLBACK_KEY}]`,
        before: null,
        after: episode,
        reason: action.reasoning,
        changeType: ActionChangeType.ADD,
        category: ENTITY_CATEGORY_ROADMAP,
        friendlyName: episodeTitle || NEW_EPISODE_LABEL,
        summary: undefined,
      })
    })
  }
  if (roadmap.seasonStructure) {
    changes.push({
      path: `${EPISODE_ROADMAP_FIELD}.${SEASON_STRUCTURE_FIELD}`,
      before: null,
      after: roadmap.seasonStructure,
      reason: action.reasoning,
      changeType: ActionChangeType.ADD,
      category: ENTITY_CATEGORY_ROADMAP,
      friendlyName: SEASON_STRUCTURE_LABEL,
      summary: undefined,
    })
  }
}

function extractUpdateChanges(action: WireAgentAction, payload: Record<string, unknown>): ActionChange[] {
  const changes: ActionChange[] = []
  const beforeData = payload._before || null
  const source = payload.updatedFields
    ? recordFromJson(payload.updatedFields)
    : payload.updates && typeof payload.updates === 'object' && !Array.isArray(payload.updates)
      ? recordFromJson(payload.updates)
      : payload

  Object.entries(source).forEach(([key, value]) => {
    if (TECHNICAL_PAYLOAD_KEYS.has(key)) return

    if (key === EPISODE_ROADMAP_FIELD && value && typeof value === 'object') {
      pushEpisodeRoadmapChanges(changes, value, action)
      return
    }

    if (
      Array.isArray(value) &&
      EXPANDABLE_ARRAY_FIELD_KEY_SET.has(key)
    ) {
      pushArrayItemChanges(changes, key, value, action)
      return
    }

    changes.push({
      path: key,
      before: beforeData,
      after: value,
      reason: action.reasoning,
      changeType: beforeData ? ActionChangeType.MODIFY : ActionChangeType.ADD,
      category: FIELD_CATEGORIES[key] || ENTITY_CATEGORY_GENERAL,
      friendlyName: FRIENDLY_FIELD_NAMES[key] || formatFieldName(key),
      summary: generateSummary(action.type, key, value),
    })
  })

  return changes
}

export function extractChanges(action: WireAgentAction): ActionChange[] {
  const changes: ActionChange[] = []
  const payload = recordFromJson(action.payload)

  if (action.type.startsWith(ACTION_PREFIX_UPDATE)) {
    return extractUpdateChanges(action, payload)
  }

  if (action.type.startsWith(ACTION_PREFIX_CREATE)) {
    const entityType = action.type.replace(ACTION_PREFIX_CREATE, '').toLowerCase()
    changes.push({
      path: entityType,
      before: null,
      after: payload,
      reason: action.reasoning,
      changeType: ActionChangeType.ADD,
      category: entityCategory(entityType),
      friendlyName: `New ${formatFieldName(entityType)}`,
      summary: generateSummary(action.type, entityType, payload),
    })
    return changes
  }

  if (action.type.startsWith(ACTION_PREFIX_DELETE)) {
    const entityType = action.type.replace(ACTION_PREFIX_DELETE, '').toLowerCase()
    changes.push({
      path: entityType,
      before: payload,
      after: null,
      reason: action.reasoning,
      changeType: ActionChangeType.REMOVE,
      category: entityCategory(entityType),
      friendlyName: formatFieldName(entityType),
    })
    return changes
  }

  if (Object.keys(payload).length > 0) {
    changes.push({
      path: PAYLOAD_PATH,
      before: null,
      after: payload,
      reason: action.reasoning,
      changeType: ActionChangeType.MODIFY,
      category: ENTITY_CATEGORY_GENERAL,
      friendlyName: ACTION_DATA_LABEL,
    })
  }

  return changes
}
