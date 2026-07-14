import type { MentionItem, ProjectContext } from '@/shared/chat'
import {
  CONNECTION_ID_SLICE_LENGTH,
  CONNECTION_LABEL_SEPARATOR,
  CONNECTION_NAME_PREFIX,
  CONNECTION_PREVIEW_MAX_LENGTH,
  ENTITY_ID_PREFIX_CONNECTION,
  ENTITY_ID_PREFIX_LOOP,
  ENTITY_ID_PREFIX_MECHANIC,
  ENTITY_TYPE,
  ENTITY_TYPE_ICONS,
  MENTION_CATEGORY_ENTITY,
} from '@/domains/loop-creator/core/mentions/constants/mention-catalog'

function matchesFilter(value: string, filter: string): boolean {
  if (!filter) return true
  return value.toLowerCase().includes(filter.toLowerCase())
}

export function mechanicMentionItems(
  filter: string,
  mechanics: NonNullable<ProjectContext['mechanics']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const mech of mechanics) {
    if (!matchesFilter(mech.name, filter)) continue
    items.push({
      id: `${ENTITY_ID_PREFIX_MECHANIC}-${mech.id}`,
      name: mech.name,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.MECHANIC,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.MECHANIC],
      preview: mech.type || undefined,
      context: mech,
    })
  }
  return items
}

export function loopMentionItems(
  filter: string,
  loops: NonNullable<ProjectContext['loops']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const loop of loops) {
    if (!matchesFilter(loop.name, filter)) continue
    items.push({
      id: `${ENTITY_ID_PREFIX_LOOP}-${loop.id}`,
      name: loop.name,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.LOOP,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.LOOP],
      preview: loop.type || undefined,
      context: loop,
    })
  }
  return items
}

export function connectionMentionItems(
  filter: string,
  connections: NonNullable<ProjectContext['connections']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const conn of connections) {
    const label = `${conn.source}${CONNECTION_LABEL_SEPARATOR}${conn.target}`
    if (!matchesFilter(label, filter)) continue
    items.push({
      id: `${ENTITY_ID_PREFIX_CONNECTION}-${conn.id}`,
      name: `${CONNECTION_NAME_PREFIX}${conn.id.slice(0, CONNECTION_ID_SLICE_LENGTH)}`,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.CONNECTION,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.CONNECTION],
      preview: label.slice(0, CONNECTION_PREVIEW_MAX_LENGTH),
      context: conn,
    })
  }
  return items
}

export function entityMentionItems(filter: string, context: ProjectContext): MentionItem[] {
  return [
    ...(context.mechanics ? mechanicMentionItems(filter, context.mechanics) : []),
    ...(context.loops ? loopMentionItems(filter, context.loops) : []),
    ...(context.connections ? connectionMentionItems(filter, context.connections) : []),
  ]
}
