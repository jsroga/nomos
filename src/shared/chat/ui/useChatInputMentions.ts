import { useEffect, useMemo, useState } from 'react'
import {
  MentionCategory,
  MentionItem,
  MentionProvider,
  ProjectContext,
} from '../core/mentions/types'
import { MentionCategoryId } from '../core/constants/mention-types'
import { CHAT_INPUT_FETCH_MENTIONS_ERROR } from './constants/chat-input'

export function useChatInputMentions(
  mentionProviders: MentionProvider[],
  projectContext: ProjectContext | undefined,
  legacyMentions: MentionItem[],
  mentionFilter: string
) {
  const [providerItems, setProviderItems] = useState<MentionItem[]>([])

  useEffect(() => {
    if (!projectContext && mentionProviders.length === 0) return

    let isMounted = true

    const fetchItems = async () => {
      try {
        const promises = mentionProviders.map(provider =>
          provider.getItems(mentionFilter, projectContext || { projectId: '' })
        )
        const results = await Promise.all(promises)
        if (isMounted) {
          setProviderItems(results.flat())
        }
      } catch (err) {
        console.error(CHAT_INPUT_FETCH_MENTIONS_ERROR, err)
      }
    }

    const timeoutId = setTimeout(fetchItems, 200)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [mentionProviders, projectContext, mentionFilter])

  const allMentionItems = useMemo(() => {
    const convertedLegacy: MentionItem[] = legacyMentions.map(m => ({
      ...m,
      category: MentionCategoryId.Entity,
    }))
    return [...providerItems, ...convertedLegacy]
  }, [providerItems, legacyMentions])

  const filteredMentions = useMemo(() => {
    return allMentionItems
      .filter(m => m.name && m.name.toLowerCase().includes(mentionFilter.toLowerCase()))
      .slice(0, 12)
  }, [allMentionItems, mentionFilter])

  const groupedMentions = useMemo(() => {
    const groups: Record<MentionCategory, MentionItem[]> = {
      entity: [],
      agent: [],
      section: [],
    }
    for (const item of filteredMentions) {
      const category = item.category || MentionCategoryId.Entity
      groups[category].push(item)
    }
    return groups
  }, [filteredMentions])

  const flatFilteredList = useMemo(() => {
    return [...groupedMentions.entity, ...groupedMentions.agent, ...groupedMentions.section]
  }, [groupedMentions])

  return { groupedMentions, flatFilteredList }
}
