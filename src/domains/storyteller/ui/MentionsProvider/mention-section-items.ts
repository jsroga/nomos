import type { MentionItem, ProjectContext } from '@/shared/chat'
import {
  MENTION_CATEGORY_SECTION,
  SECTION_FILTER_ALIASES,
  SECTION_ICON_LIGHTBULB,
  SECTION_ICON_MUSIC,
  SECTION_ICON_SCROLL,
  SECTION_ICON_SHUFFLE,
  SECTION_INSPIRATIONS,
  SECTION_PLOT_TWISTS,
  SECTION_SOUNDTRACKS,
  SECTION_WORLD_RULES,
} from '@/domains/storyteller/ui/MentionsProvider/constants/mention-catalog'

function matchesSectionFilter(filterLower: string, aliases: readonly string[]): boolean {
  if (!filterLower) return true
  return aliases.some(alias => alias.includes(filterLower) || filterLower.includes(alias))
}

export function sectionMentionItems(filter: string, context: ProjectContext): MentionItem[] {
  const items: MentionItem[] = []
  const filterLower = filter.toLowerCase()
  const bible = context.seriesBible

  const worldRules = bible?.worldRules || []
  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.worldRules)) {
    items.push({
      id: `section-${SECTION_WORLD_RULES}`,
      name: SECTION_WORLD_RULES,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_WORLD_RULES,
      icon: SECTION_ICON_SCROLL,
      preview: `${worldRules.length} rules`,
      context: worldRules,
    })
  }

  const inspirations = bible?.inspirations
  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.inspirations)) {
    const count =
      (inspirations?.books?.length || 0) +
      (inspirations?.movies?.length || 0) +
      (inspirations?.games?.length || 0)
    items.push({
      id: `section-${SECTION_INSPIRATIONS}`,
      name: SECTION_INSPIRATIONS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_INSPIRATIONS,
      icon: SECTION_ICON_LIGHTBULB,
      preview: `${count} items`,
      context: inspirations,
    })
  }

  const soundtracks = bible?.soundtracks || []
  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.soundtracks)) {
    items.push({
      id: `section-${SECTION_SOUNDTRACKS}`,
      name: SECTION_SOUNDTRACKS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_SOUNDTRACKS,
      icon: SECTION_ICON_MUSIC,
      preview: `${soundtracks.length} tracks`,
      context: soundtracks,
    })
  }

  const plotTwists = bible?.plotTwists || []
  if (matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.plotTwists)) {
    items.push({
      id: `section-${SECTION_PLOT_TWISTS}`,
      name: SECTION_PLOT_TWISTS,
      category: MENTION_CATEGORY_SECTION,
      type: SECTION_PLOT_TWISTS,
      icon: SECTION_ICON_SHUFFLE,
      preview: `${plotTwists.length} twists`,
      context: plotTwists,
    })
  }

  return items
}
