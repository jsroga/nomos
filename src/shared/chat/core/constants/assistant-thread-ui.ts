/** Assistant thread UI copy and entity-card colouring. */

export enum ChatEntityKind {
  Character = 'character',
  Location = 'location',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
}

export enum ChatMessageRole {
  Assistant = 'assistant',
  User = 'user',
}

export enum ChatPartType {
  Text = 'text',
}

export enum ChatMessageStatus {
  Running = 'running',
}

export const CHAT_ENTITY_KIND_STYLE: Record<
  ChatEntityKind,
  { fill: string; border: string; foreground: string }
> = {
  [ChatEntityKind.Character]: {
    fill: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.28)',
    foreground: 'rgb(147, 197, 253)',
  },
  [ChatEntityKind.Location]: {
    fill: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.28)',
    foreground: 'rgb(134, 239, 172)',
  },
  [ChatEntityKind.Faction]: {
    fill: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.28)',
    foreground: 'rgb(192, 132, 252)',
  },
  [ChatEntityKind.Item]: {
    fill: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    foreground: 'rgb(252, 211, 77)',
  },
  [ChatEntityKind.Quest]: {
    fill: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.28)',
    foreground: 'rgb(252, 211, 77)',
  },
}

export const ASSISTANT_THREAD_COPY = {
  EmptyHint: 'Start a conversation.',
  InputPlaceholder: 'Ask anything about your world…',
  KeyboardHint: 'Enter to send · Shift+Enter for a new line',
  Thinking: 'Thinking',
  Connecting: 'Connecting',
  Writing: 'Writing',
  AddToWorld: 'Add to world',
  AddedToWorld: 'Added',
  SectionLabelJoin: ', ',
  DayToday: 'Today',
  ModelFallback: 'Auto',
  AddToWorldPromptPrefix: 'Add these to the world bible:\n',
  ShowDetails: 'Details',
  ShowDetailsAria: 'Show tool and JSON details',
  HideDetailsAria: 'Hide tool and JSON details',
} as const

export const ASSISTANT_THREAD_WIRE = {
  MentionAt: '@',
  MentionAtSpace: '@ ',
  CssHeightAuto: 'auto',
} as const

/** Keys forwarded on assistant-ui → `/api/assistant/*` request bodies. */
export enum AssistantChatBodyKey {
  ModelName = 'modelName',
  ProjectId = 'projectId',
  EpisodeId = 'episodeId',
  BibleSection = 'bibleSection',
  Messages = 'messages',
}

export type AssistantChatModelOption = {
  id: string
  label: string
}

export type ParsedChatEntity = {
  name: string
  description: string
  kind: ChatEntityKind
}

/** Split assistant markdown into framing prose + entity cards when list-like. */
export function parseAssistantEntities(text: string): {
  before: string
  entities: ParsedChatEntity[]
  after: string
} {
  const lines = text.split('\n')
  const entities: ParsedChatEntity[] = []
  const beforeLines: string[] = []
  const afterLines: string[] = []
  let inList = false
  let listEnded = false

  for (const line of lines) {
    const match =
      line.match(/^\s*(?:[-*]|\d+\.)\s+\*\*(.+?)\*\*\s*[—\-:–]\s*(.+)\s*$/) ??
      line.match(/^\s*(?:[-*]|\d+\.)\s+\*\*(.+?)\*\*\s*[—\-:–]?\s*(.*)$/)

    if (match && match[1] && !listEnded) {
      inList = true
      const name = match[1].trim()
      const description = (match[2] ?? '').trim()
      if (name.length > 0) {
        entities.push({
          name,
          description: description.length > 0 ? description : name,
          kind: inferEntityKind(name, description),
        })
      }
      continue
    }

    if (inList && line.trim() === '') {
      continue
    }

    if (inList) {
      listEnded = true
      afterLines.push(line)
      continue
    }

    beforeLines.push(line)
  }

  if (entities.length < 2) {
    return { before: text, entities: [], after: '' }
  }

  return {
    before: beforeLines.join('\n').trim(),
    entities,
    after: afterLines.join('\n').trim(),
  }
}

function inferEntityKind(name: string, description: string): ChatEntityKind {
  const hay = `${name} ${description}`.toLowerCase()
  if (/\b(faction|guild|court|order|clan|house)\b/.test(hay)) {
    return ChatEntityKind.Faction
  }
  if (/\b(district|city|port|island|region|location|place)\b/.test(hay)) {
    return ChatEntityKind.Location
  }
  if (/\b(quest|mission|contract)\b/.test(hay)) {
    return ChatEntityKind.Quest
  }
  if (/\b(item|artifact|relic|weapon)\b/.test(hay)) {
    return ChatEntityKind.Item
  }
  if (/\b(leader|captain|character|person|who)\b/.test(hay)) {
    return ChatEntityKind.Character
  }
  return ChatEntityKind.Faction
}

/** Follow-up chips from bold names / short clauses in the last assistant reply. */
export function deriveFollowUpChips(lastAssistantText: string, limit = 3): string[] {
  const names = [...lastAssistantText.matchAll(/\*\*(.+?)\*\*/g)]
    .map(match => match[1]?.trim())
    .filter((name): name is string => Boolean(name) && name.length < 48)

  const unique = [...new Set(names)].slice(0, limit)
  if (unique.length > 0) {
    return unique.map(name => `Expand ${name}`)
  }

  const chips: string[] = []
  if (/faction/i.test(lastAssistantText)) chips.push('Draft their creed')
  if (/city|district|coast|map/i.test(lastAssistantText)) chips.push('Map the districts')
  if (/war|conflict|tension/i.test(lastAssistantText)) chips.push('What starts the war?')
  if (chips.length === 0) chips.push('Go deeper', 'Give me alternatives')
  return chips.slice(0, limit)
}

export function shortModelLabel(raw: string | undefined): string {
  if (!raw) return ASSISTANT_THREAD_COPY.ModelFallback
  const leaf = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw
  return leaf.replace(/-/g, ' ').slice(0, 18)
}
