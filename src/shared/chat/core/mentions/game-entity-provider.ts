/**
 * Game Entity Mention Provider
 *
 * Universal provider that queries the game_entities table for cross-domain mentions.
 * Enables @mentioning entities from ANY domain in ANY chat interface.
 */

import { MentionProvider, MentionItem, ProjectContext } from './types'
import { GameEntity } from '@/shared/data/queries/useGameEntities'
import { MentionCategoryId } from '../constants/mention-types'
import { GameEntityQueryParam } from '@/shared/data/constants/game-entities-wire'
import { buildUrl } from '@/shared/data/url-builder'
import {
  EntityApiQueryParam,
  GAME_ENTITY_FETCH_ERROR,
  GAME_ENTITY_LOG_PREFIX,
  iconForEntityType,
  labelForSourceDomain,
} from '../constants/game-entity-mentions'

/**
 * Fetches game entities from API
 */
async function fetchGameEntities(projectId: string, search?: string): Promise<GameEntity[]> {
  try {
    const response = await fetch(
      buildUrl('/api/entities', {
        [GameEntityQueryParam.ProjectId]: projectId,
        [EntityApiQueryParam.Search]: search,
      })
    )
    if (!response.ok) throw new Error(GAME_ENTITY_FETCH_ERROR)

    const data = await response.json()
    return data.entities || []
  } catch (error) {
    console.error(GAME_ENTITY_LOG_PREFIX, error)
    return []
  }
}

/**
 * Universal Game Entity Provider
 *
 * Provides entities from ALL domains for @mentions in any chat interface.
 */
export const gameEntityProvider: MentionProvider = {
  category: MentionCategoryId.Entity,
  getItems: async (filter: string, context: ProjectContext): Promise<MentionItem[]> => {
    if (!context.projectId) return []

    // Fetch entities from game_entities table
    const entities = await fetchGameEntities(context.projectId, filter)

    // Convert to MentionItems
    return entities.map(entity => {
      const icon = iconForEntityType(entity.entityType)
      const sourceDomain = labelForSourceDomain(entity.sourceDomain)

      // Build preview showing source and usage
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
          _isGameEntity: true, // Flag for special handling
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
