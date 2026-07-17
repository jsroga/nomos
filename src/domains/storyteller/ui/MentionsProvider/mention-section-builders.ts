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

function sectionItem(
  sectionId: string,
  name: string,
  icon: string,
  preview: string,
  context: unknown,
): MentionItem {
  return {
    id: `section-${sectionId}`,
    name,
    category: MENTION_CATEGORY_SECTION,
    type: sectionId,
    icon,
    preview,
    context,
  }
}

export function worldRulesSectionItem(
  filterLower: string,
  bible: ProjectContext['seriesBible'],
): MentionItem | null {
  if (!matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.worldRules)) return null
  const worldRules = bible?.worldRules || []
  return sectionItem(
    SECTION_WORLD_RULES,
    SECTION_WORLD_RULES,
    SECTION_ICON_SCROLL,
    `${worldRules.length} rules`,
    worldRules,
  )
}

export function inspirationsSectionItem(
  filterLower: string,
  bible: ProjectContext['seriesBible'],
): MentionItem | null {
  if (!matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.inspirations)) return null
  const inspirations = bible?.inspirations
  const count =
    (inspirations?.books?.length || 0) +
    (inspirations?.movies?.length || 0) +
    (inspirations?.games?.length || 0)
  return sectionItem(
    SECTION_INSPIRATIONS,
    SECTION_INSPIRATIONS,
    SECTION_ICON_LIGHTBULB,
    `${count} items`,
    inspirations,
  )
}

export function soundtracksSectionItem(
  filterLower: string,
  bible: ProjectContext['seriesBible'],
): MentionItem | null {
  if (!matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.soundtracks)) return null
  const soundtracks = bible?.soundtracks || []
  return sectionItem(
    SECTION_SOUNDTRACKS,
    SECTION_SOUNDTRACKS,
    SECTION_ICON_MUSIC,
    `${soundtracks.length} tracks`,
    soundtracks,
  )
}

export function plotTwistsSectionItem(
  filterLower: string,
  bible: ProjectContext['seriesBible'],
): MentionItem | null {
  if (!matchesSectionFilter(filterLower, SECTION_FILTER_ALIASES.plotTwists)) return null
  const plotTwists = bible?.plotTwists || []
  return sectionItem(
    SECTION_PLOT_TWISTS,
    SECTION_PLOT_TWISTS,
    SECTION_ICON_SHUFFLE,
    `${plotTwists.length} twists`,
    plotTwists,
  )
}
