/**
 * Cross-Domain Suggestion Engine
 *
 * Provides intelligent workflow suggestions that guide users across domains.
 * Analyzes entities and suggests relevant actions in other tools.
 */

import { GameEntity } from '@/hooks/useGameEntities'

export interface CrossDomainSuggestion {
  id: string
  title: string
  description: string
  sourceDomain: string
  targetDomain: string
  targetRoute: string
  entityId: string
  entityName: string
  autoMessage?: string // Message to auto-send in target domain
  icon: string
  priority: number // 1-5, higher = more important
}

/**
 * Suggestion Engine - Analyzes entities and generates cross-domain suggestions
 */
export class SuggestionEngine {
  /**
   * Get suggestions for a newly created entity
   */
  static getSuggestionsForEntity(entity: GameEntity, projectId: string): CrossDomainSuggestion[] {
    const suggestions: CrossDomainSuggestion[] = []

    switch (entity.entityType) {
      case 'character':
        suggestions.push(...this.getCharacterSuggestions(entity, projectId))
        break
      case 'mechanic':
        suggestions.push(...this.getMechanicSuggestions(entity, projectId))
        break
      case 'location':
        suggestions.push(...this.getLocationSuggestions(entity, projectId))
        break
      case 'faction':
        suggestions.push(...this.getFactionSuggestions(entity, projectId))
        break
    }

    // Sort by priority
    return suggestions.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Character suggestions
   */
  private static getCharacterSuggestions(
    entity: GameEntity,
    projectId: string
  ): CrossDomainSuggestion[] {
    const suggestions: CrossDomainSuggestion[] = []

    // If created in Storyteller → suggest Loop Creator
    if (entity.sourceDomain === 'storyteller') {
      suggestions.push({
        id: `char-to-mechanics-${entity.id}`,
        title: `Design mechanics for ${entity.name}`,
        description: 'Create gameplay systems and abilities for this character',
        sourceDomain: 'storyteller',
        targetDomain: 'loop-creator',
        targetRoute: `/app/${projectId}/loop-creator`,
        entityId: entity.id,
        entityName: entity.name,
        autoMessage: `Design combat and movement mechanics for @${entity.name}. Consider their role and personality from the story.`,
        icon: 'Gamepad2',
        priority: 5,
      })

      suggestions.push({
        id: `char-to-home-${entity.id}`,
        title: `Build ${entity.name}'s home`,
        description: "Design the character's living space in 3D",
        sourceDomain: 'storyteller',
        targetDomain: 'interior-designer',
        targetRoute: `/app/${projectId}/interior-design`,
        entityId: entity.id,
        entityName: entity.name,
        icon: 'Home',
        priority: 3,
      })
    }

    // If created in Loop Creator → suggest Storyteller
    if (entity.sourceDomain === 'loop-creator') {
      suggestions.push({
        id: `char-mechanics-to-story-${entity.id}`,
        title: `Write a story for ${entity.name}`,
        description: 'Develop narrative arc and character development',
        sourceDomain: 'loop-creator',
        targetDomain: 'storyteller',
        targetRoute: `/app/${projectId}/storyteller`,
        entityId: entity.id,
        entityName: entity.name,
        autoMessage: `Write a story arc for @${entity.name}. They have gameplay mechanics defined - incorporate those into the narrative.`,
        icon: 'BookOpen',
        priority: 4,
      })
    }

    return suggestions
  }

  /**
   * Mechanic suggestions
   */
  private static getMechanicSuggestions(
    entity: GameEntity,
    projectId: string
  ): CrossDomainSuggestion[] {
    const suggestions: CrossDomainSuggestion[] = []

    // Mechanic → Story
    suggestions.push({
      id: `mechanic-to-story-${entity.id}`,
      title: `Write a story featuring ${entity.name}`,
      description: 'Create narrative scenarios that showcase this mechanic',
      sourceDomain: 'loop-creator',
      targetDomain: 'storyteller',
      targetRoute: `/app/${projectId}/storyteller`,
      entityId: entity.id,
      entityName: entity.name,
      autoMessage: `Write a scene that demonstrates the @${entity.name} mechanic in action. Make it feel exciting and impactful.`,
      icon: 'BookOpen',
      priority: 5,
    })

    // Mechanic → Level Design
    suggestions.push({
      id: `mechanic-to-level-${entity.id}`,
      title: `Design a level for ${entity.name}`,
      description: 'Create environments that leverage this mechanic',
      sourceDomain: 'loop-creator',
      targetDomain: 'interior-designer',
      targetRoute: `/app/${projectId}/interior-design`,
      entityId: entity.id,
      entityName: entity.name,
      icon: 'Map',
      priority: 4,
    })

    return suggestions
  }

  /**
   * Location suggestions
   */
  private static getLocationSuggestions(
    entity: GameEntity,
    projectId: string
  ): CrossDomainSuggestion[] {
    const suggestions: CrossDomainSuggestion[] = []

    // Location → 3D Design
    suggestions.push({
      id: `location-to-3d-${entity.id}`,
      title: `Build ${entity.name} in 3D`,
      description: 'Create the interior layout and details',
      sourceDomain: entity.sourceDomain,
      targetDomain: 'interior-designer',
      targetRoute: `/app/${projectId}/interior-design`,
      entityId: entity.id,
      entityName: entity.name,
      icon: 'Home',
      priority: 5,
    })

    // Location → World Map
    suggestions.push({
      id: `location-to-map-${entity.id}`,
      title: `Add ${entity.name} to world map`,
      description: 'Place this location on the game world map',
      sourceDomain: entity.sourceDomain,
      targetDomain: 'world-building',
      targetRoute: `/app/${projectId}/world-gen`,
      entityId: entity.id,
      entityName: entity.name,
      icon: 'Map',
      priority: 4,
    })

    // Location → Story Scene
    if (entity.sourceDomain !== 'storyteller') {
      suggestions.push({
        id: `location-to-scene-${entity.id}`,
        title: `Write a scene at ${entity.name}`,
        description: 'Create story moments in this location',
        sourceDomain: entity.sourceDomain,
        targetDomain: 'storyteller',
        targetRoute: `/app/${projectId}/storyteller`,
        entityId: entity.id,
        entityName: entity.name,
        autoMessage: `Write a dramatic scene that takes place at @${entity.name}. Use the location's atmosphere and details.`,
        icon: 'BookOpen',
        priority: 3,
      })
    }

    return suggestions
  }

  /**
   * Faction suggestions
   */
  private static getFactionSuggestions(
    entity: GameEntity,
    projectId: string
  ): CrossDomainSuggestion[] {
    const suggestions: CrossDomainSuggestion[] = []

    // Faction → Characters
    suggestions.push({
      id: `faction-to-members-${entity.id}`,
      title: `Create members of ${entity.name}`,
      description: 'Design characters who belong to this faction',
      sourceDomain: entity.sourceDomain,
      targetDomain: 'storyteller',
      targetRoute: `/app/${projectId}/storyteller`,
      entityId: entity.id,
      entityName: entity.name,
      autoMessage: `Create 2-3 key members of the @${entity.name} faction. Give them distinct personalities and roles.`,
      icon: 'Users',
      priority: 4,
    })

    return suggestions
  }

  /**
   * Get suggestions based on project state (future: analyze entire project)
   */
  static async getContextualSuggestions(projectId: string): Promise<CrossDomainSuggestion[]> {
    // Fetch all entities for the project
    try {
      const response = await fetch(`/api/entities?projectId=${projectId}`)
      if (!response.ok) return []

      const { entities } = await response.json()

      // Analyze project state and generate suggestions
      const suggestions: CrossDomainSuggestion[] = []

      // Example: If user has characters but no mechanics → suggest creating mechanics
      const hasCharacters = entities.some((e: GameEntity) => e.entityType === 'character')
      const hasMechanics = entities.some((e: GameEntity) => e.entityType === 'mechanic')

      if (hasCharacters && !hasMechanics) {
        const firstCharacter = entities.find((e: GameEntity) => e.entityType === 'character')
        if (firstCharacter) {
          suggestions.push({
            id: 'contextual-char-to-mech',
            title: 'Design gameplay mechanics',
            description: 'You have characters but no mechanics yet',
            sourceDomain: 'storyteller',
            targetDomain: 'loop-creator',
            targetRoute: `/app/${projectId}/loop-creator`,
            entityId: firstCharacter.id,
            entityName: firstCharacter.name,
            autoMessage: `Design core gameplay mechanics for this game. We have characters like @${firstCharacter.name} - what should they be able to do?`,
            icon: 'Gamepad2',
            priority: 4,
          })
        }
      }

      return suggestions
    } catch (error) {
      console.error('[SuggestionEngine] Error getting contextual suggestions:', error)
      return []
    }
  }
}
