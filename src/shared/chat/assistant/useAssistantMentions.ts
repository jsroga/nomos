'use client'

/**
 * B3 mention adapter for assistant-ui: loads the existing `@/shared/chat`
 * mention providers once and feeds `unstable_useMentionAdapter`. Spread the
 * result into a composer `@`-trigger popover once the Thread composer is wired
 * (final B3 step — see ASSISTANT-UI-SWAP-TRACKER.md).
 */

import { useEffect, useState } from 'react'
import { unstable_useMentionAdapter } from '@assistant-ui/react'
import type {
  MentionItem,
  MentionProvider,
  ProjectContext,
} from '@/shared/chat/core/mentions/types'
import { toMentionCategories } from './mention-categories'

export type AssistantMentionBundle = ReturnType<typeof unstable_useMentionAdapter>

export function useAssistantMentions(
  providers: readonly MentionProvider[],
  projectContext: ProjectContext
): AssistantMentionBundle {
  const [items, setItems] = useState<MentionItem[]>([])

  useEffect(() => {
    let cancelled = false
    void Promise.all(providers.map(provider => Promise.resolve(provider.getItems('', projectContext))))
      .then(results => {
        if (!cancelled) setItems(results.flat())
      })
      .catch(() => {
        /* mentions are best-effort — a failed provider must not break the composer */
      })
    return () => {
      cancelled = true
    }
  }, [providers, projectContext])

  return unstable_useMentionAdapter({ categories: toMentionCategories(items) })
}
