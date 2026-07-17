/**
 * Storyteller Domain Mention Providers
 *
 * Provides mentionable items for the Storyteller chat:
 * - Entities: characters, episodes, beats, factions, places, events
 * - Agents: writer, premise_architect, plot_architect, etc.
 * - Sections: worldRules, inspirations, soundtracks, plotTwists
 * - Registry: All entities from the EntityRegistry (GraphRAG-enabled) - SERVER ONLY
 */

import type { MentionProvider, MentionItem, ProjectContext } from '@/shared/chat'
import {
  DEFAULT_ENTITY_ICON,
  ENTITY_TYPE_ICONS,
  MENTION_CATEGORY_AGENT,
  MENTION_CATEGORY_ENTITY,
  MENTION_CATEGORY_SECTION,
  STORYTELLER_AGENT_MENTION_CATALOG,
} from '@/domains/storyteller/ui/MentionsProvider/constants/mention-catalog'
import { entityMentionItems } from '@/domains/storyteller/ui/MentionsProvider/mention-entity-items'
import { sectionMentionItems } from '@/domains/storyteller/ui/MentionsProvider/mention-section-items'
import { buildStorytellerProjectContext } from '@/domains/storyteller/ui/MentionsProvider/build-storyteller-project-context'

export { buildStorytellerProjectContext }

function entityIconForType(type: string): string {
  for (const [entityType, icon] of Object.entries(ENTITY_TYPE_ICONS)) {
    if (entityType === type) return icon
  }
  return DEFAULT_ENTITY_ICON
}

/**
 * Entity Provider - Characters, Episodes, Beats, Factions
 */
export const storytellerEntityProvider: MentionProvider = {
  category: MENTION_CATEGORY_ENTITY,
  getItems: (filter: string, context: ProjectContext): MentionItem[] =>
    entityMentionItems(filter, context),
}

/**
 * Agent Provider - Storyteller specialist agents
 */
export const storytellerAgentProvider: MentionProvider = {
  category: MENTION_CATEGORY_AGENT,
  getItems: (filter: string): MentionItem[] => {
    if (!filter) return STORYTELLER_AGENT_MENTION_CATALOG

    const filterLower = filter.toLowerCase()
    return STORYTELLER_AGENT_MENTION_CATALOG.filter(
      agent =>
        agent.name.toLowerCase().includes(filterLower) ||
        agent.preview?.toLowerCase().includes(filterLower)
    )
  },
}

/**
 * Section Provider - Series Bible sections
 */
export const storytellerSectionProvider: MentionProvider = {
  category: MENTION_CATEGORY_SECTION,
  getItems: (filter: string, context: ProjectContext): MentionItem[] =>
    sectionMentionItems(filter, context),
}

/**
 * Entity Registry Provider - All registered entities from the EntityRegistry
 */
export const entityRegistryProvider: MentionProvider = {
  category: MENTION_CATEGORY_ENTITY,
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []
    const registryEntities = context.registryEntities

    if (!registryEntities || registryEntities.length === 0) {
      return items
    }

    const filterLower = filter.toLowerCase()

    for (const entity of registryEntities) {
      if (
        filter &&
        !entity.name.toLowerCase().includes(filterLower) &&
        !entity.type.toLowerCase().includes(filterLower)
      ) {
        continue
      }

      items.push({
        id: entity.id,
        name: entity.name,
        category: MENTION_CATEGORY_ENTITY,
        type: entity.type,
        icon: entityIconForType(entity.type),
        preview: entity.description?.slice(0, 50) || `${entity.type}`,
        context: {
          ...entity.metadata,
          refId: entity.id,
          entityType: entity.type,
          reference: `[${entity.name}][${entity.id}]`,
        },
      })
    }

    return items
  },
}

export function getStorytellerMentionProviders(): MentionProvider[] {
  return [
    storytellerEntityProvider,
    storytellerAgentProvider,
    storytellerSectionProvider,
    entityRegistryProvider,
  ]
}
