import type { UIMessage } from 'ai'
import { isPlainObject, readString } from '@/shared/data/json-guards'
import { ChatMessageRole, ChatPartType } from '@/shared/chat/core/constants/assistant-thread-ui'

export enum OverlayHistoryMessageFormat {
  AiSdkV6 = 'ai-sdk/v6',
}

export enum OverlayMemoryPartType {
  Reasoning = 'reasoning',
}

enum MemoryRowField {
  Id = 'id',
  Role = 'role',
  Parts = 'parts',
  Content = 'content',
  Text = 'text',
  Reasoning = 'reasoning',
  CreatedAt = 'createdAt',
  CreatedAtSnake = 'created_at',
  Type = 'type',
}

export type OverlayHistoryEntry = {
  id: string
  parent_id: string | null
  format: OverlayHistoryMessageFormat
  content: Record<string, unknown>
}

type OverlayUiPart =
  | { type: ChatPartType.Text; text: string }
  | { type: OverlayMemoryPartType.Reasoning; text: string }

function isChatRole(value: string | undefined): value is ChatMessageRole {
  return value === ChatMessageRole.User || value === ChatMessageRole.Assistant
}

function createdAtMs(row: Record<string, unknown>): number | null {
  const raw = row[MemoryRowField.CreatedAt] ?? row[MemoryRowField.CreatedAtSnake]
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (raw instanceof Date) return raw.getTime()
  if (typeof raw === 'string') {
    const ms = Date.parse(raw)
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

function textPart(text: string): OverlayUiPart | null {
  return text.trim() ? { type: ChatPartType.Text, text } : null
}

function mapMemoryPart(part: unknown): OverlayUiPart | null {
  if (!isPlainObject(part)) return null
  const type = readString(part[MemoryRowField.Type])
  if (type === ChatPartType.Text) {
    return textPart(readString(part[MemoryRowField.Text]) ?? '')
  }
  if (type === OverlayMemoryPartType.Reasoning) {
    const text =
      readString(part[MemoryRowField.Text]) ?? readString(part[MemoryRowField.Reasoning]) ?? ''
    return text.trim() ? { type: OverlayMemoryPartType.Reasoning, text } : null
  }
  return null
}

function partsFromContent(content: unknown): OverlayUiPart[] {
  if (typeof content === 'string') {
    const part = textPart(content)
    return part ? [part] : []
  }
  if (!isPlainObject(content)) return []
  if (Array.isArray(content[MemoryRowField.Parts])) {
    return content[MemoryRowField.Parts].flatMap(part => {
      const mapped = mapMemoryPart(part)
      return mapped ? [mapped] : []
    })
  }
  const text = textPart(readString(content[MemoryRowField.Text]) ?? '')
  return text ? [text] : []
}

function partsFromRow(row: Record<string, unknown>): OverlayUiPart[] {
  if (Array.isArray(row[MemoryRowField.Parts])) {
    const fromParts = row[MemoryRowField.Parts].flatMap(part => {
      const mapped = mapMemoryPart(part)
      return mapped ? [mapped] : []
    })
    if (fromParts.length > 0) return fromParts
  }
  return partsFromContent(row[MemoryRowField.Content])
}

function sortMemoryRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const stamped = rows.map(row => ({ row, ms: createdAtMs(row) }))
  if (stamped.some(item => item.ms === null)) return rows
  return [...stamped].sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0)).map(item => item.row)
}

function uiMessageFromRow(row: Record<string, unknown>): UIMessage | null {
  const id = readString(row[MemoryRowField.Id])
  const role = readString(row[MemoryRowField.Role])
  if (!id || !isChatRole(role)) return null
  const parts = partsFromRow(row)
  if (parts.length === 0) return null
  return { id, role, parts }
}

/** Mastra `listMessages` rows (or already-UI messages) → AI SDK UI messages. */
export function mastraMemoryToUiMessages(raw: unknown[]): UIMessage[] {
  const rows = raw.filter(isPlainObject)
  const messages: UIMessage[] = []
  for (const row of sortMemoryRows(rows)) {
    const message = uiMessageFromRow(row)
    if (message) messages.push(message)
  }
  return messages
}

/** assistant-ui `withFormat` storage records from UI messages. */
export function uiMessagesToHistoryEntries(messages: UIMessage[]): OverlayHistoryEntry[] {
  const entries: OverlayHistoryEntry[] = []
  let parentId: string | null = null
  for (const message of messages) {
    entries.push({
      id: message.id,
      parent_id: parentId,
      format: OverlayHistoryMessageFormat.AiSdkV6,
      content: {
        [MemoryRowField.Role]: message.role,
        [MemoryRowField.Parts]: message.parts,
      },
    })
    parentId = message.id
  }
  return entries
}

export function shouldHydrateOverlayMessages(currentCount: number, incomingCount: number): boolean {
  return currentCount === 0 && incomingCount > 0
}
