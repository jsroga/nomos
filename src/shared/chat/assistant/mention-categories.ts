/**
 * Bridge the existing `@/shared/chat` mention items into assistant-ui's
 * `Unstable_MentionCategory[]` (B3). Pure + testable; the hook that loads
 * provider items and feeds `unstable_useMentionAdapter` lives in
 * `useAssistantMentions.ts`.
 */

import type { MentionItem } from '@/shared/chat/core/mentions/types'
import { CATEGORY_META, MentionCategoryId } from '@/shared/chat/core/constants/mention-types'
import type { Unstable_Mention, Unstable_MentionCategory } from '@assistant-ui/react'

function toMention(item: MentionItem): Unstable_Mention {
  return {
    id: item.id,
    type: item.type,
    label: item.name,
    ...(item.preview ? { description: item.preview } : {}),
    ...(item.icon ? { icon: item.icon } : {}),
  }
}

/**
 * Group mention items by category (Entities / Agents / Sections) in the catalog
 * order, dropping empty categories.
 */
export function toMentionCategories(items: readonly MentionItem[]): Unstable_MentionCategory[] {
  const byCategory = new Map<string, MentionItem[]>()
  for (const item of items) {
    const list = byCategory.get(item.category) ?? []
    list.push(item)
    byCategory.set(item.category, list)
  }

  const categories: Unstable_MentionCategory[] = []
  for (const categoryId of Object.values(MentionCategoryId)) {
    const categoryItems = byCategory.get(categoryId)
    if (!categoryItems || categoryItems.length === 0) continue
    categories.push({
      id: categoryId,
      label: CATEGORY_META[categoryId].label,
      items: categoryItems.map(toMention),
    })
  }
  return categories
}
