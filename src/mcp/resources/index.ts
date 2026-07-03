/**
 * MCP Resources Registry
 *
 * Resources provide read-only access to data.
 * Unlike tools, resources are for data retrieval only.
 */

import { MCPServerResources } from '@mastra/mcp'
import { entitiesService, storytellerService } from '@/shared/data/EntitiesService'
import { validateApiKey, getServiceContext } from '../core/auth'

// ============================================
// HELPERS
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

// ============================================
// RESOURCE IMPLEMENTATION
// ============================================

export const mcpResources: MCPServerResources = {
  listResources: async () => {
    // Auth check optional for listing? Let's check env var presence at least
    // But listResources usually doesn't take args, so passing API key is hard unless global or env.
    // In stdio, env var is the way.

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
  },

  getResourceContent: async ({ uri }) => {
    // Validate API Key
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error('MCP_API_KEY environment variable not set')

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error('Invalid API key')

    const context = await getServiceContext(authResult)
    const { type, params } = parseResourceUri(uri)

    let result: any

    switch (type) {
      case 'projects': {
        const { data, error } = await context.supabase
          .from('projects')
          .select('id, name, description, created_at, updated_at')
          .eq('user_id', context.userId)
          .order('updated_at', { ascending: false })

        if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
        result = { projects: data }
        break
      }

      case 'project-entities': {
        result = await entitiesService.list(
          { projectId: params.projectId },
          { userId: context.userId, supabase: context.supabase }
        )
        break
      }

      case 'project-characters': {
        result = await storytellerService.listCharacters(
          { projectId: params.projectId },
          { userId: context.userId }
        )
        break
      }

      case 'project-episodes': {
        result = await storytellerService.listEpisodes(
          { projectId: params.projectId },
          { userId: context.userId }
        )
        break
      }

      case 'series-bible': {
        result = await storytellerService.getSeriesBible(params.projectId, {
          userId: context.userId,
        })
        break
      }

      case 'episode-beats': {
        result = await storytellerService.listBeats(
          { episodeId: params.episodeId },
          { userId: context.userId }
        )
        break
      }

      default:
        throw new Error(`Unknown resource type: ${type}`)
    }

    return {
      text: JSON.stringify(result, null, 2),
    }
  },
}
