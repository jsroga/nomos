/**
 * Game Entity Mention Provider
 * 
 * Universal provider that queries the game_entities table for cross-domain mentions.
 * Enables @mentioning entities from ANY domain in ANY chat interface.
 */

import { MentionProvider, MentionItem, ProjectContext } from './types'
import { GameEntity } from '@/hooks/useGameEntities'

const ENTITY_TYPE_ICONS: Record<string, string> = {
  character: 'User',
  location: 'MapPin',
  mechanic: 'Cog',
  faction: 'Users',
  item: 'Package',
  quest: 'Target',
}

const DOMAIN_LABELS: Record<string, string> = {
  storyteller: 'Storyteller',
  'loop-creator': 'Loop Creator',
  'interior-designer': 'Interior Designer',
  'world-building': 'World Builder',
}

/**
 * Fetches game entities from API
 */
async function fetchGameEntities(projectId: string, search?: string): Promise<GameEntity[]> {
  try {
    const params = new URLSearchParams({ projectId })
    if (search) params.append('search', search)
    
    const response = await fetch(`/api/entities?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch entities')
    
    const data = await response.json()
    return data.entities || []
  } catch (error) {
    console.error('[GameEntityProvider] Fetch error:', error)
    return []
  }
}

/**
 * Universal Game Entity Provider
 * 
 * Provides entities from ALL domains for @mentions in any chat interface.
 */
export const gameEntityProvider: MentionProvider = {
  category: 'entity',
  getItems: async (filter: string, context: ProjectContext): Promise<MentionItem[]> => {
    if (!context.projectId) return []
    
    // Fetch entities from game_entities table
    const entities = await fetchGameEntities(context.projectId, filter)
    
    // Convert to MentionItems
    return entities.map(entity => {
      const icon = ENTITY_TYPE_ICONS[entity.entityType] || 'Database'
      const sourceDomain = DOMAIN_LABELS[entity.sourceDomain] || entity.sourceDomain
      
      // Build preview showing source and usage
      let preview = `From: ${sourceDomain}`
      if (entity.usedInDomains.length > 1) {
        preview += ` • Used in ${entity.usedInDomains.length} domains`
      }
      
      return {
        id: `entity-${entity.id}`,
        name: entity.name,
        category: 'entity',
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
