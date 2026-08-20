/**
 * Game Entity Mention Provider
 *
 * Universal provider that queries the game_entities table for cross-domain mentions.
 * Enables @mentioning entities from ANY domain in ANY chat interface.
 */

import { MentionProvider, MentionItem, ProjectContext } from './types'
import { MentionCategoryId } from '../constants/mention-types'
import {
  GAME_ENTITY_LOG_PREFIX,
  iconForEntityType,
  isIgnorableGameEntityFetchError,
  labelForSourceDomain,
} from '../constants/game-entity-mentions'
import { fetchGameEntitiesForMentions } from '../io/chat-ui.api'

/**
 * Universal Game Entity Provider
 *
 * Provides entities from ALL domains for @mentions in any chat interface.
 */
export const gameEntityProvider: MentionProvider = {
  category: MentionCategoryId.Entity,
  getItems: async (
    filter: string,
    context: ProjectContext,
    signal?: AbortSignal,
  ): Promise<MentionItem[]> => {
    if (!context.projectId) return []

    let entities
    try {
      entities = await fetchGameEntitiesForMentions(context.projectId, filter, signal)
    } catch (error) {
      if (!isIgnorableGameEntityFetchError(error)) {
        console.error(GAME_ENTITY_LOG_PREFIX, error)
      }
      return []
    }

    return entities.map(entity => {
      const icon = iconForEntityType(entity.entityType)
      const sourceDomain = labelForSourceDomain(entity.sourceDomain)

      let preview = `From: ${sourceDomain}`
      if (entity.usedInDomains.length > 1) {
        preview += ` • Used in ${entity.usedInDomains.length} domains`
      }

      return {
        id: `entity-${entity.id}`,
        name: entity.name,
        category: MentionCategoryId.Entity,
        type: entity.entityType,
        icon,
        preview,
        context: {
          ...entity,
          _isGameEntity: true,
        },
      }
    })
  },
}

/**
 * Get game entity provider for use in chat interfaces
 */
export function getGameEntityProvider(): MentionProvider {
  return gameEntityProvider
}
