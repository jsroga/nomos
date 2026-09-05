'use client'

/**
 * B3 mention adapter for assistant-ui: loads `@/shared/chat` mention providers
 * and builds a stable `{ adapter, directive }` bundle with plain React hooks.
 *
 * Intentionally avoids `unstable_useMentionAdapter` — that hook calls `useAui()`
 * + tap/react-shim memos, which can change hook counts under React Compiler and
 * crash with "Rendered fewer hooks than expected".
 */

import { useEffect, useMemo, useState } from 'react'
import { unstable_defaultDirectiveFormatter } from '@assistant-ui/react'
import type {
  MentionItem,
  MentionProvider,
  ProjectContext,
} from '@/shared/chat/core/mentions/types'
import { toMentionCategories } from './mention-categories'

export interface AssistantMentionBundle {
  adapter: {
    categories: () => { id: string; label: string }[]
    categoryItems: (id: string) => { id: string; type: string; label: string; description?: string }[]
    search: (query: string) => { id: string; type: string; label: string; description?: string }[]
  }
  directive: {
    formatter: typeof unstable_defaultDirectiveFormatter
  }
}

function matchesQuery(
  item: { id: string; label: string; description?: string },
  lower: string
): boolean {
  if (!lower) return true
  if (item.id.toLowerCase().includes(lower)) return true
  if (item.label.toLowerCase().includes(lower)) return true
  if (item.description?.toLowerCase().includes(lower)) return true
  return false
}

export function useAssistantMentions(
  providers: readonly MentionProvider[],
  projectContext: ProjectContext
): AssistantMentionBundle {
  const [items, setItems] = useState<MentionItem[]>([])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    void (async () => {
      try {
        const results = await Promise.all(
          providers.map(provider =>
            Promise.resolve(provider.getItems('', projectContext, controller.signal)),
          ),
        )
        if (!cancelled) setItems(results.flat())
      } catch {
        /* mentions are best-effort — a failed provider must not break the composer */
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [providers, projectContext])

  const categories = useMemo(() => toMentionCategories(items), [items])

  const adapter = useMemo(() => {
    const groups = categories.map(cat => ({
      id: cat.id,
      label: cat.label,
      items: cat.items.map(item => ({
        id: item.id,
        type: item.type,
        label: item.label,
        ...(item.description !== undefined ? { description: item.description } : {}),
      })),
    }))

    return {
      categories: () => groups.map(({ id, label }) => ({ id, label })),
      categoryItems: (id: string) => groups.find(g => g.id === id)?.items ?? [],
      search: (query: string) => {
        const lower = query.toLowerCase()
        return groups.flatMap(g => g.items).filter(item => matchesQuery(item, lower))
      },
    }
  }, [categories])

  const directive = useMemo(
    () => ({ formatter: unstable_defaultDirectiveFormatter }),
    []
  )

  return { adapter, directive }
}
