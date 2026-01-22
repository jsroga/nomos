/**
 * MCP Resources Registry
 *
 * Resources provide read-only access to data.
 * Unlike tools, resources are for data retrieval only.
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js'
import { MCPServiceContext } from '../core/types'
import { entitiesService, storytellerService } from '@/services'

// ============================================
// RESOURCE DEFINITIONS
// ============================================

/**
 * Get all available MCP resources
 */
export function getAllResources(): Resource[] {
  return [
    {
      uri: 'wbk://projects',
      name: 'Projects List',
      description: 'List of all projects accessible to the current user',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/entities',
      name: 'Project Entities',
      description: 'All game entities in a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/characters',
      name: 'Project Characters',
      description: 'All characters in a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/episodes',
      name: 'Project Episodes',
      description: 'All episodes in a project',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://project/{projectId}/series-bible',
      name: 'Series Bible',
      description:
        'The series bible for a project containing world description, characters, factions, and story plan',
      mimeType: 'application/json',
    },
    {
      uri: 'wbk://episode/{episodeId}/beats',
      name: 'Episode Beats',
      description: 'All beats in an episode',
      mimeType: 'application/json',
    },
  ]
}

// ============================================
// RESOURCE HANDLERS
// ============================================

/**
 * Parse a resource URI and extract parameters
 */
function parseResourceUri(uri: string): { type: string; params: Record<string, string> } {
  // wbk://projects
  if (uri === 'wbk://projects') {
    return { type: 'projects', params: {} }
  }

  // wbk://project/{projectId}/entities
  const entitiesMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/entities$/)
  if (entitiesMatch) {
    return { type: 'project-entities', params: { projectId: entitiesMatch[1] } }
  }

  // wbk://project/{projectId}/characters
  const charactersMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/characters$/)
  if (charactersMatch) {
    return { type: 'project-characters', params: { projectId: charactersMatch[1] } }
  }

  // wbk://project/{projectId}/episodes
  const episodesMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/episodes$/)
  if (episodesMatch) {
    return { type: 'project-episodes', params: { projectId: episodesMatch[1] } }
  }

  // wbk://project/{projectId}/series-bible
  const bibleMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/series-bible$/)
  if (bibleMatch) {
    return { type: 'series-bible', params: { projectId: bibleMatch[1] } }
  }

  // wbk://episode/{episodeId}/beats
  const beatsMatch = uri.match(/^wbk:\/\/episode\/([^/]+)\/beats$/)
  if (beatsMatch) {
    return { type: 'episode-beats', params: { episodeId: beatsMatch[1] } }
  }

  throw new Error(`Unknown resource URI: ${uri}`)
}

/**
 * Read a resource by URI
 */
export async function handleResourceRead(uri: string, context: MCPServiceContext): Promise<any> {
  const { type, params } = parseResourceUri(uri)

  switch (type) {
    case 'projects': {
      // List all projects for the user
      const { data, error } = await context.supabase
        .from('projects')
        .select('id, name, description, created_at, updated_at')
        .eq('user_id', context.userId)
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch projects: ${error.message}`)
      }

      return { projects: data }
    }

    case 'project-entities': {
      return entitiesService.list(
        { projectId: params.projectId },
        { userId: context.userId, supabase: context.supabase }
      )
    }

    case 'project-characters': {
      return storytellerService.listCharacters(
        { projectId: params.projectId },
        { userId: context.userId }
      )
    }

    case 'project-episodes': {
      return storytellerService.listEpisodes(
        { projectId: params.projectId },
        { userId: context.userId }
      )
    }

    case 'series-bible': {
      return storytellerService.getSeriesBible(params.projectId, { userId: context.userId })
    }

    case 'episode-beats': {
      return storytellerService.listBeats(
        { episodeId: params.episodeId },
        { userId: context.userId }
      )
    }

    default:
      throw new Error(`Unknown resource type: ${type}`)
  }
}
