/**
 * Storyteller Domain Mention Providers
 *
 * Provides mentionable items for the Storyteller chat:
 * - Entities: characters, episodes, beats, factions, places, events
 * - Agents: writer, premise_architect, plot_architect, etc.
 * - Sections: worldRules, inspirations, soundtracks, plotTwists
 * - Registry: All entities from the EntityRegistry (GraphRAG-enabled) - SERVER ONLY
 */

import type { MentionProvider, MentionItem, ProjectContext } from '@/domains/chat'

// Entity type definitions (duplicated to avoid importing server-only code)
type EntityType = 'character' | 'place' | 'event' | 'faction' | 'rule' | 'beat' | 'episode'

// Icon mapping for entity types
const ENTITY_TYPE_ICONS: Record<EntityType, string> = {
  character: 'User',
  place: 'MapPin',
  event: 'Calendar',
  faction: 'Users',
  rule: 'Scroll',
  beat: 'Zap',
  episode: 'Tv',
}

function entityIconForType(type: string): string {
  for (const [entityType, icon] of Object.entries(ENTITY_TYPE_ICONS)) {
    if (entityType === type) return icon
  }
  return 'Hash'
}

/**
 * Entity Provider - Characters, Episodes, Beats, Factions
 */
export const storytellerEntityProvider: MentionProvider = {
  category: 'entity',
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []
    const filterLower = filter.toLowerCase()

    // Characters
    if (context.characters) {
      for (const char of context.characters) {
        if (!filter || char.name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `char-${char.id}`,
            name: char.name,
            category: 'entity',
            type: 'character',
            icon: 'User',
            preview: char.role || undefined,
            context: char,
          })
        }
      }
    }

    // Episodes
    if (context.episodes) {
      for (const ep of context.episodes) {
        const name = ep.title || `Episode ${ep.number || '?'}`
        if (!filter || name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `ep-${ep.id}`,
            name,
            category: 'entity',
            type: 'episode',
            icon: 'Tv',
            preview: ep.number ? `#${ep.number}` : undefined,
            context: ep,
          })
        }
      }
    }

    // Beats
    if (context.beats) {
      for (const beat of context.beats) {
        const name = beat.logline?.slice(0, 30) || `Beat ${beat.sequence || '?'}`
        if (!filter || name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `beat-${beat.id}`,
            name: `Beat_${beat.sequence || beat.id.slice(0, 4)}`,
            category: 'entity',
            type: 'beat',
            icon: 'Zap',
            preview: beat.logline?.slice(0, 40),
            context: beat,
          })
        }
      }
    }

    // Factions
    if (context.factions) {
      for (const faction of context.factions) {
        if (!filter || faction.name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `faction-${faction.id}`,
            name: faction.name,
            category: 'entity',
            type: 'faction',
            icon: 'Users',
            preview: faction.ideology?.slice(0, 40),
            context: faction,
          })
        }
      }
    }

    return items
  },
}

/**
 * Agent Provider - Storyteller specialist agents
 */
export const storytellerAgentProvider: MentionProvider = {
  category: 'agent',
  getItems: (filter: string): MentionItem[] => {
    const agents: MentionItem[] = [
      {
        id: 'agent-writer',
        name: 'writer',
        category: 'agent',
        type: 'writer',
        icon: 'PenTool',
        preview: 'Script & dialogue',
      },
      {
        id: 'agent-premise',
        name: 'premise_architect',
        category: 'agent',
        type: 'premise_architect',
        icon: 'Building2',
        preview: 'World building',
      },
      {
        id: 'agent-plot',
        name: 'plot_architect',
        category: 'agent',
        type: 'plot_architect',
        icon: 'Map',
        preview: 'Story structure',
      },
      {
        id: 'agent-devils',
        name: 'devils_advocate',
        category: 'agent',
        type: 'devils_advocate',
        icon: 'AlertTriangle',
        preview: 'Critical review',
      },
      {
        id: 'agent-episode',
        name: 'episode_premise_architect',
        category: 'agent',
        type: 'episode_premise_architect',
        icon: 'FileEdit',
        preview: 'Episode premises',
      },
      {
        id: 'agent-psychology',
        name: 'character_psychology',
        category: 'agent',
        type: 'character_psychology',
        icon: 'User',
        preview: 'Character analysis',
      },
    ]

    if (!filter) return agents

    const filterLower = filter.toLowerCase()
    return agents.filter(
      a =>
        a.name.toLowerCase().includes(filterLower) || a.preview?.toLowerCase().includes(filterLower)
    )
  },
}

/**
 * Section Provider - Series Bible sections
 */
export const storytellerSectionProvider: MentionProvider = {
  category: 'section',
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []
    const filterLower = filter.toLowerCase()
    const bible = context.seriesBible

    // World Rules
    const worldRules = bible?.worldRules || []
    if (!filter || 'worldrules'.includes(filterLower) || 'rules'.includes(filterLower)) {
      items.push({
        id: 'section-worldRules',
        name: 'worldRules',
        category: 'section',
        type: 'worldRules',
        icon: 'Scroll',
        preview: `${worldRules.length} rules`,
        context: worldRules,
      })
    }

    // Inspirations
    const inspirations = bible?.inspirations
    if (!filter || 'inspirations'.includes(filterLower)) {
      const count =
        (inspirations?.books?.length || 0) +
        (inspirations?.movies?.length || 0) +
        (inspirations?.games?.length || 0)
      items.push({
        id: 'section-inspirations',
        name: 'inspirations',
        category: 'section',
        type: 'inspirations',
        icon: 'Lightbulb',
        preview: `${count} items`,
        context: inspirations,
      })
    }

    // Soundtracks
    const soundtracks = bible?.soundtracks || []
    if (!filter || 'soundtracks'.includes(filterLower) || 'music'.includes(filterLower)) {
      items.push({
        id: 'section-soundtracks',
        name: 'soundtracks',
        category: 'section',
        type: 'soundtracks',
        icon: 'Music',
        preview: `${soundtracks.length} tracks`,
        context: soundtracks,
      })
    }

    // Plot Twists
    const plotTwists = bible?.plotTwists || []
    if (!filter || 'plottwists'.includes(filterLower) || 'twists'.includes(filterLower)) {
      items.push({
        id: 'section-plotTwists',
        name: 'plotTwists',
        category: 'section',
        type: 'plotTwists',
        icon: 'Shuffle',
        preview: `${plotTwists.length} twists`,
        context: plotTwists,
      })
    }

    return items
  },
}

/**
 * Entity Registry Provider - All registered entities from the EntityRegistry
 * This enables @ mentions for entities that the LLM has referenced
 *
 * NOTE: This provider requires server-side data fetching.
 * The actual entity list should be passed via context.registryEntities
 * which is populated by the parent component fetching from the API.
 */
export const entityRegistryProvider: MentionProvider = {
  category: 'entity',
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []

    // Registry entities should be passed via context from server
    // This avoids importing server-only database code in client components
    const registryEntities = context.registryEntities

    if (!registryEntities || registryEntities.length === 0) {
      return items
    }

    const filterLower = filter.toLowerCase()

    for (const entity of registryEntities) {
      // Filter by name or type
      if (
        filter &&
        !entity.name.toLowerCase().includes(filterLower) &&
        !entity.type.toLowerCase().includes(filterLower)
      ) {
        continue
      }

      items.push({
        id: entity.id, // Already in format like "char-abc123"
        name: entity.name,
        category: 'entity',
        type: entity.type,
        icon: entityIconForType(entity.type),
        preview: entity.description?.slice(0, 50) || `${entity.type}`,
        context: {
          ...entity.metadata,
          refId: entity.id,
          entityType: entity.type,
          // Include the reference format for easy insertion
          reference: `[${entity.name}][${entity.id}]`,
        },
      })
    }

    return items
  },
}

/**
 * Get all Storyteller mention providers
 */
export function getStorytellerMentionProviders(): MentionProvider[] {
  return [
    storytellerEntityProvider,
    storytellerAgentProvider,
    storytellerSectionProvider,
    entityRegistryProvider, // Add registry-based provider
  ]
}

/**
 * Build project context from Storyteller data
 */
export function buildStorytellerProjectContext(data: {
  projectId: string
  characters?: any[]
  episodes?: any[]
  beats?: any[]
  seriesBible?: any
}): ProjectContext {
  // Extract factions from series bible
  const factions = data.seriesBible?.factions || data.seriesBible?.storyPlan?.factions || []

  return {
    projectId: data.projectId,
    characters: data.characters,
    episodes: data.episodes,
    beats: data.beats,
    factions,
    seriesBible: {
      worldRules: data.seriesBible?.worldRules || data.seriesBible?.storyPlan?.worldRules || [],
      inspirations: data.seriesBible?.inspirations || data.seriesBible?.storyPlan?.inspirations,
      soundtracks: data.seriesBible?.soundtracks || data.seriesBible?.storyPlan?.soundtracks || [],
      plotTwists: data.seriesBible?.plotTwists || data.seriesBible?.storyPlan?.plotTwists || [],
    },
  }
}
