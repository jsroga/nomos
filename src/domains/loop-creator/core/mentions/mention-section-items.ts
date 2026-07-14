import type { MentionItem, ProjectContext } from '@/shared/chat'
import {
  MENTION_CATEGORY_SECTION,
  SECTION_ALL_LOOPS,
  SECTION_ALL_MECHANICS,
  SECTION_BALANCE_ANALYSIS,
  SECTION_COUNT_LABEL_LOOPS,
  SECTION_COUNT_LABEL_MECHANICS,
  SECTION_FILTER_ALIASES,
  SECTION_GAME_CONTEXT,
  SECTION_ICON_BALANCE,
  SECTION_ICON_GAME_CONTEXT,
  SECTION_ICON_LOOPS,
  SECTION_ICON_MECHANICS,
  SECTION_ID_PREFIX,
  SECTION_PREVIEW_AVAILABLE,
  SECTION_PREVIEW_NOT_DEFINED,
  SECTION_PREVIEW_NOT_GENERATED,
  SECTION_TYPE_LOOPS,
  SECTION_TYPE_MECHANICS,
} from '@/domains/loop-creator/core/mentions/constants/mention-catalog'

function matchesSectionFilter(filterLower: string, aliases: readonly string[]): boolean {
  if (!filterLower) return true
  return aliases.some(alias => alias.includes(filterLower) || filterLower.includes(alias))
}

export function sectionMentionItems(filter: string, context: ProjectContext): MentionItem[] {
  const items: MentionItem[] = []
  const filterLower = filter.toLowerCase()

  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.balanceAnalysis)) {
    const hasAnalysis = !!context.balanceAnalysis
    items.push({
      id: `${SECTION_ID_PREFIX}${SECTION_BALANCE_ANALYSIS}`,
      name: SECTION_BALANCE_ANALYSIS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_BALANCE_ANALYSIS,
      icon: SECTION_ICON_BALANCE,
      preview: hasAnalysis ? SECTION_PREVIEW_AVAILABLE : SECTION_PREVIEW_NOT_GENERATED,
      context: context.balanceAnalysis,
    })
  }

  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.gameContext)) {
    const gameContext = context.gameContext
    items.push({
      id: `${SECTION_ID_PREFIX}${SECTION_GAME_CONTEXT}`,
      name: SECTION_GAME_CONTEXT,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_GAME_CONTEXT,
      icon: SECTION_ICON_GAME_CONTEXT,
      preview: gameContext?.genre || SECTION_PREVIEW_NOT_DEFINED,
      context: gameContext,
    })
  }

  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.allMechanics)) {
    const mechCount = context.mechanics?.length || 0
    items.push({
      id: `${SECTION_ID_PREFIX}${SECTION_ALL_MECHANICS}`,
      name: SECTION_ALL_MECHANICS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_TYPE_MECHANICS,
      icon: SECTION_ICON_MECHANICS,
      preview: `${mechCount} ${SECTION_COUNT_LABEL_MECHANICS}`,
      context: context.mechanics,
    })
  }

  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.allLoops)) {
    const loopCount = context.loops?.length || 0
    items.push({
      id: `${SECTION_ID_PREFIX}${SECTION_ALL_LOOPS}`,
      name: SECTION_ALL_LOOPS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_TYPE_LOOPS,
      icon: SECTION_ICON_LOOPS,
      preview: `${loopCount} ${SECTION_COUNT_LABEL_LOOPS}`,
      context: context.loops,
    })
  }

  return items
}
