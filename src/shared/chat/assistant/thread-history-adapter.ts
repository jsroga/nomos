'use client'

/**
 * assistant-ui thread persistence (roadmap B / ASSISTANT-UI-SWAP-TRACKER). A
 * `ThreadHistoryAdapter` backed by sessionStorage so a Writers-Room / crew
 * conversation survives reloads and route changes within a tab.
 *
 * `useChatRuntime` drives the AI-SDK runtime, which uses the adapter's
 * `withFormat(...)` path: the format adapter encodes/decodes between the runtime
 * message and a plain JSON storage record, and we persist those records.
 * Swapping sessionStorage for a Supabase-backed store later only touches the
 * read/write helpers here.
 */

import type {
  ThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageStorageEntry,
  GenericThreadHistoryAdapter,
} from '@assistant-ui/react'
import { fetchChatSessionMessages } from '@/shared/chat/core/io/chat-sessions.api'

const STORAGE_PREFIX = 'aui-thread-'
const ENTRY_KEY_ID = 'id'
const ENTRY_KEY_FORMAT = 'format'
const ENTRY_KEY_CONTENT = 'content'

type StoredEntry = MessageStorageEntry<Record<string, unknown>>

function storageKeyFor(persistKey: string): string {
  return `${STORAGE_PREFIX}${persistKey}`
}

/** JSON-boundary guard: a persisted content record is the adapter's storage format. */
function isStorageContent<T extends Record<string, unknown>>(value: unknown): value is T {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStoredEntry(value: unknown): value is StoredEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    ENTRY_KEY_ID in value &&
    ENTRY_KEY_FORMAT in value &&
    ENTRY_KEY_CONTENT in value
  )
}

function readEntries(persistKey: string): StoredEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(storageKeyFor(persistKey))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isStoredEntry) : []
  } catch {
    return []
  }
}

function writeEntries(persistKey: string, entries: StoredEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(storageKeyFor(persistKey), JSON.stringify(entries))
  } catch {
    // Quota / serialization failures are non-fatal — persistence is best-effort.
  }
}

/** Clear a persisted thread (e.g. on "new conversation"). */
export function clearThreadHistory(persistKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(storageKeyFor(persistKey))
  } catch {
    // ignore
  }
}

function withFormatFromStoredEntries<TMessage, TStorageFormat extends Record<string, unknown>>(
  loadEntries: () => StoredEntry[] | Promise<StoredEntry[]>,
  formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
): GenericThreadHistoryAdapter<TMessage> {
  return {
    async load() {
      const messages: MessageFormatItem<TMessage>[] = []
      const entries = await loadEntries()
      for (const entry of entries) {
        if (entry.format !== formatAdapter.format) continue
        if (!isStorageContent<TStorageFormat>(entry.content)) continue
        try {
          messages.push(formatAdapter.decode({ ...entry, content: entry.content }))
        } catch {
          // Skip records that no longer decode (format drift).
        }
      }
      const last = messages[messages.length - 1]
      const headId = last ? formatAdapter.getId(last.message) : null
      return { headId, messages }
    },

    async append() {
      // Base append is unused on the AI-SDK runtime (withFormat path handles it).
    },
  }
}

function withFormatAdapter<TMessage, TStorageFormat extends Record<string, unknown>>(
  persistKey: string,
  formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>
): GenericThreadHistoryAdapter<TMessage> {
  const formatted = withFormatFromStoredEntries(() => readEntries(persistKey), formatAdapter)
  return {
    load: formatted.load,
    async append(item) {
      const entry: StoredEntry = {
        id: formatAdapter.getId(item.message),
        parent_id: item.parentId,
        format: formatAdapter.format,
        content: formatAdapter.encode(item),
      }
      const entries = readEntries(persistKey).filter(existing => existing.id !== entry.id)
      entries.push(entry)
      writeEntries(persistKey, entries)
    },
  }
}

/** sessionStorage-backed thread history adapter for `useChatRuntime`. */
export function createSessionThreadHistoryAdapter(persistKey: string): ThreadHistoryAdapter {
  return {
    async load() {
      return { messages: [] }
    },
    async append() {
      // Base append is unused on the AI-SDK runtime (withFormat path handles it).
    },
    withFormat(formatAdapter) {
      return withFormatAdapter(persistKey, formatAdapter)
    },
  }
}

/** Overlay history — Mastra memory via GET /api/chat/sessions/{id}/messages. */
export function createOverlayThreadHistoryAdapter(sessionId: string): ThreadHistoryAdapter {
  return {
    async load() {
      await fetchChatSessionMessages(sessionId)
      return { messages: [] }
    },
    async append() {
      // Mastra memory is the source of truth; local append is unused.
    },
    withFormat(formatAdapter) {
      return withFormatFromStoredEntries(async () => {
        const raw = await fetchChatSessionMessages(sessionId)
        return raw.filter(isStoredEntry)
      }, formatAdapter)
    },
  }
}
