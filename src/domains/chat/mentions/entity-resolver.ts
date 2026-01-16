/**
 * Entity Data Resolver
 * 
 * Resolves full entity data when user clicks on @mentions.
 * Handles navigation to entity's source domain.
 */

import { GameEntity } from '@/hooks/useGameEntities'

/**
 * Resolve full entity data from game_entities table
 */
export async function resolveEntity(entityId: string): Promise<GameEntity | null> {
  try {
    const response = await fetch(`/api/entities/${entityId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch entity')
    }
    
    const data = await response.json()
    return data.entity
  } catch (error) {
    console.error('[EntityResolver] Error resolving entity:', error)
    return null
  }
}

/**
 * Navigate to entity's source domain
 */
export function navigateToEntity(entity: GameEntity, projectId: string): void {
  const domainRoutes: Record<string, string> = {
    storyteller: `/app/${projectId}/storyteller`,
    'loop-creator': `/app/${projectId}/loop-creator`,
    'interior-designer': `/app/${projectId}/interior-design`,
    'world-building': `/app/${projectId}/world-gen`,
  }
  
  const route = domainRoutes[entity.sourceDomain]
  if (route) {
    window.location.href = route
  } else {
    console.warn(`[EntityResolver] Unknown source domain: ${entity.sourceDomain}`)
  }
}

/**
 * Get entity source domain label
 */
export function getEntitySourceLabel(sourceDomain: string): string {
  const labels: Record<string, string> = {
    storyteller: 'Storyteller',
    'loop-creator': 'Loop Creator',
    'interior-designer': 'Interior Designer',
    'world-building': 'World Builder',
  }
  
  return labels[sourceDomain] || sourceDomain
}

/**
 * Get entity type color class (for badges, chips, etc.)
 */
export function getEntityTypeColor(entityType: string): string {
  const colors: Record<string, string> = {
    character: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    location: 'bg-green-500/10 text-green-400 border-green-500/20',
    mechanic: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    faction: 'bg-red-500/10 text-red-400 border-red-500/20',
    item: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    quest: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  
  return colors[entityType] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

/**
 * Check if entity is used in multiple domains
 */
export function isMultiDomainEntity(entity: GameEntity): boolean {
  return entity.usedInDomains.length > 1
}

/**
 * Format entity for display in tooltips, modals, etc.
 */
export function formatEntityDisplay(entity: GameEntity): {
  title: string
  subtitle: string
  badges: Array<{ label: string; variant: 'default' | 'secondary' | 'outline' }>
} {
  return {
    title: entity.name,
    subtitle: entity.description || `${entity.entityType} from ${getEntitySourceLabel(entity.sourceDomain)}`,
    badges: [
      {
        label: entity.entityType,
        variant: 'secondary',
      },
      {
        label: getEntitySourceLabel(entity.sourceDomain),
        variant: 'outline',
      },
      ...(isMultiDomainEntity(entity) ? [{
        label: `${entity.usedInDomains.length} domains`,
        variant: 'default' as const,
      }] : []),
    ],
  }
}
