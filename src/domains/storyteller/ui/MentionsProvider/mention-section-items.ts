import type { MentionItem, ProjectContext } from '@/shared/chat'
import {
  inspirationsSectionItem,
  plotTwistsSectionItem,
  soundtracksSectionItem,
  worldRulesSectionItem,
} from '@/domains/storyteller/ui/MentionsProvider/mention-section-builders'

export function sectionMentionItems(filter: string, context: ProjectContext): MentionItem[] {
  const filterLower = filter.toLowerCase()
  const bible = context.seriesBible

  return [
    worldRulesSectionItem(filterLower, bible),
    inspirationsSectionItem(filterLower, bible),
    soundtracksSectionItem(filterLower, bible),
    plotTwistsSectionItem(filterLower, bible),
  ].filter((item): item is MentionItem => item !== null)
}
