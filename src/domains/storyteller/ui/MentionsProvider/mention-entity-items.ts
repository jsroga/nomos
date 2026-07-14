import type { MentionItem, ProjectContext } from '@/shared/chat'
import {
  ENTITY_TYPE,
  ENTITY_TYPE_ICONS,
  MENTION_CATEGORY_ENTITY,
} from '@/domains/storyteller/ui/MentionsProvider/constants/mention-catalog'

const EPISODE_LABEL = 'Episode'
const BEAT_LABEL = 'Beat'
const BEAT_NAME_PREFIX = 'Beat_'
const UNKNOWN_MARKER = '?'

function matchesFilter(value: string, filter: string): boolean {
  if (!filter) return true
  return value.toLowerCase().includes(filter.toLowerCase())
}

export function characterMentionItems(
  filter: string,
  characters: NonNullable<ProjectContext['characters']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const char of characters) {
    if (!matchesFilter(char.name, filter)) continue
    items.push({
      id: `char-${char.id}`,
      name: char.name,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.CHARACTER,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.CHARACTER],
      preview: char.role || undefined,
      context: char,
    })
  }
  return items
}

export function episodeMentionItems(
  filter: string,
  episodes: NonNullable<ProjectContext['episodes']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const ep of episodes) {
    const name = ep.title || `${EPISODE_LABEL} ${ep.number || UNKNOWN_MARKER}`
    if (!matchesFilter(name, filter)) continue
    items.push({
      id: `ep-${ep.id}`,
      name,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.EPISODE,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.EPISODE],
      preview: ep.number ? `#${ep.number}` : undefined,
      context: ep,
    })
  }
  return items
}

export function beatMentionItems(
  filter: string,
  beats: NonNullable<ProjectContext['beats']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const beat of beats) {
    const name = beat.logline?.slice(0, 30) || `${BEAT_LABEL} ${beat.sequence || UNKNOWN_MARKER}`
    if (!matchesFilter(name, filter)) continue
    items.push({
      id: `beat-${beat.id}`,
      name: `${BEAT_NAME_PREFIX}${beat.sequence || beat.id.slice(0, 4)}`,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.BEAT,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.BEAT],
      preview: beat.logline?.slice(0, 40),
      context: beat,
    })
  }
  return items
}

export function factionMentionItems(
  filter: string,
  factions: NonNullable<ProjectContext['factions']>
): MentionItem[] {
  const items: MentionItem[] = []
  for (const faction of factions) {
    if (!faction.name || !matchesFilter(faction.name, filter)) continue
    items.push({
      id: `faction-${faction.id ?? faction.name}`,
      name: faction.name,
      category: MENTION_CATEGORY_ENTITY,
      type: ENTITY_TYPE.FACTION,
      icon: ENTITY_TYPE_ICONS[ENTITY_TYPE.FACTION],
      preview: faction.ideology?.slice(0, 40),
      context: faction,
    })
  }
  return items
}

export function entityMentionItems(filter: string, context: ProjectContext): MentionItem[] {
  return [
    ...(context.characters ? characterMentionItems(filter, context.characters) : []),
    ...(context.episodes ? episodeMentionItems(filter, context.episodes) : []),
    ...(context.beats ? beatMentionItems(filter, context.beats) : []),
    ...(context.factions ? factionMentionItems(filter, context.factions) : []),
  ]
}
