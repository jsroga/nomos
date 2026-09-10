import {
  ASSISTANT_THREAD_COPY,
  AssistantFollowUpChip,
  ChatEntityKind,
  type ParsedChatEntity,
} from '../constants/assistant-thread-ui'

export {
  ASSISTANT_THREAD_COPY,
  ASSISTANT_THREAD_WIRE,
  AssistantChatBodyKey,
  AssistantFollowUpChip,
  CHAT_ENTITY_KIND_STYLE,
  ChatEntityKind,
  ChatMessageRole,
  ChatMessageStatus,
  ChatPartType,
  ChatToolPartPrefix,
  type AssistantChatModelOption,
  type ParsedChatEntity,
} from '../constants/assistant-thread-ui'

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

export function deriveFollowUpChips(lastAssistantText: string, limit = 3): string[] {
  const names = [...lastAssistantText.matchAll(/\*\*(.+?)\*\*/g)]
    .map(match => match[1]?.trim())
    .filter((name): name is string => Boolean(name) && name.length < 48)

  const unique = [...new Set(names)].slice(0, limit)
  if (unique.length > 0) {
    return unique.map(name => `${AssistantFollowUpChip.ExpandPrefix}${name}`)
  }

  const chips: string[] = []
  if (/faction/i.test(lastAssistantText)) chips.push(AssistantFollowUpChip.DraftCreed)
  if (/city|district|coast|map/i.test(lastAssistantText)) chips.push(AssistantFollowUpChip.MapDistricts)
  if (/war|conflict|tension/i.test(lastAssistantText)) chips.push(AssistantFollowUpChip.WhatStartsWar)
  if (chips.length === 0) {
    chips.push(AssistantFollowUpChip.GoDeeper, AssistantFollowUpChip.Alternatives)
  }
  return chips.slice(0, limit)
}

export function shortModelLabel(raw: string | undefined): string {
  if (!raw) return ASSISTANT_THREAD_COPY.ModelFallback
  const leaf = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw
  return leaf.replace(/-/g, ' ').slice(0, 18)
}
