/**
 * MCP Resources Registry
 *
 * Resources provide read-only access to data.
 * Unlike tools, resources are for data retrieval only.
 */

import { MCPServerResources } from '@mastra/mcp'
import { entitiesService } from '@/shared/data/entities-service'
import { storytellerService } from '@/domains/storyteller/server'
import { validateApiKey, getServiceContext } from '../core/auth'
import {
  ContentType,
  McpResourceAuthError,
  McpResourceDescription,
  McpResourceName,
  McpResourceQueryError,
  McpResourceType,
  McpResourceUri,
  MCP_RESOURCE_URI_PATTERN,
  McpSupabaseColumn,
  McpSupabaseProjectSelect,
  McpSupabaseTable,
} from '../constants/resources'

// ============================================
// HELPERS
// ============================================

/**
 * Parse a resource URI and extract parameters
 */
function parseResourceUri(uri: string): { type: string; params: Record<string, string> } {
  if (uri === McpResourceUri.Projects) {
    return { type: McpResourceType.Projects, params: {} }
  }

  const entitiesMatch = uri.match(MCP_RESOURCE_URI_PATTERN.ProjectEntities)
  if (entitiesMatch) {
    return { type: McpResourceType.ProjectEntities, params: { projectId: entitiesMatch[1] } }
  }

  const charactersMatch = uri.match(MCP_RESOURCE_URI_PATTERN.ProjectCharacters)
  if (charactersMatch) {
    return { type: McpResourceType.ProjectCharacters, params: { projectId: charactersMatch[1] } }
  }

  const episodesMatch = uri.match(MCP_RESOURCE_URI_PATTERN.ProjectEpisodes)
  if (episodesMatch) {
    return { type: McpResourceType.ProjectEpisodes, params: { projectId: episodesMatch[1] } }
  }

  const bibleMatch = uri.match(MCP_RESOURCE_URI_PATTERN.ProjectSeriesBible)
  if (bibleMatch) {
    return { type: McpResourceType.SeriesBible, params: { projectId: bibleMatch[1] } }
  }

  const beatsMatch = uri.match(MCP_RESOURCE_URI_PATTERN.EpisodeBeats)
  if (beatsMatch) {
    return { type: McpResourceType.EpisodeBeats, params: { episodeId: beatsMatch[1] } }
  }

  throw new Error(`${McpResourceQueryError.UnknownResourceUri} ${uri}`)
}

// ============================================
// RESOURCE IMPLEMENTATION
// ============================================

export const mcpResources: MCPServerResources = {
  listResources: async () => {
    return [
      {
        uri: McpResourceUri.Projects,
        name: McpResourceName.ProjectsList,
        description: McpResourceDescription.ProjectsList,
        mimeType: ContentType.Json,
      },
      {
        uri: McpResourceUri.ProjectEntities,
        name: McpResourceName.ProjectEntities,
        description: McpResourceDescription.ProjectEntities,
        mimeType: ContentType.Json,
      },
      {
        uri: McpResourceUri.ProjectCharacters,
        name: McpResourceName.ProjectCharacters,
        description: McpResourceDescription.ProjectCharacters,
        mimeType: ContentType.Json,
      },
      {
        uri: McpResourceUri.ProjectEpisodes,
        name: McpResourceName.ProjectEpisodes,
        description: McpResourceDescription.ProjectEpisodes,
        mimeType: ContentType.Json,
      },
      {
        uri: McpResourceUri.ProjectSeriesBible,
        name: McpResourceName.SeriesBible,
        description: McpResourceDescription.SeriesBible,
        mimeType: ContentType.Json,
      },
      {
        uri: McpResourceUri.EpisodeBeats,
        name: McpResourceName.EpisodeBeats,
        description: McpResourceDescription.EpisodeBeats,
        mimeType: ContentType.Json,
      },
    ]
  },

  getResourceContent: async ({ uri }) => {
    const apiKey = process.env.MCP_API_KEY
    if (!apiKey) throw new Error(McpResourceAuthError.ApiKeyNotSet)

    const authResult = await validateApiKey(apiKey)
    if (!authResult.valid) throw new Error(McpResourceAuthError.InvalidApiKey)

    const context = await getServiceContext(authResult)
    const { type, params } = parseResourceUri(uri)

    let result: unknown

    switch (type) {
      case McpResourceType.Projects: {
        const { data, error } = await context.supabase
          .from(McpSupabaseTable.Projects)
          .select(McpSupabaseProjectSelect.ListFields)
          .eq(McpSupabaseColumn.UserId, context.userId)
          .order(McpSupabaseColumn.UpdatedAt, { ascending: false })

        if (error) throw new Error(`${McpResourceQueryError.FailedToFetchProjects} ${error.message}`)
        result = { projects: data }
        break
      }

      case McpResourceType.ProjectEntities: {
        result = await entitiesService.list(
          { projectId: params.projectId },
          { userId: context.userId, supabase: context.supabase }
        )
        break
      }

      case McpResourceType.ProjectCharacters: {
        result = await storytellerService.listCharacters(
          { projectId: params.projectId },
          { userId: context.userId }
        )
        break
      }

      case McpResourceType.ProjectEpisodes: {
        result = await storytellerService.listEpisodes(
          { projectId: params.projectId },
          { userId: context.userId }
        )
        break
      }

      case McpResourceType.SeriesBible: {
        result = await storytellerService.getSeriesBible(params.projectId, {
          userId: context.userId,
        })
        break
      }

      case McpResourceType.EpisodeBeats: {
        result = await storytellerService.listBeats(
          { episodeId: params.episodeId },
          { userId: context.userId }
        )
        break
      }

      default:
        throw new Error(`${McpResourceQueryError.UnknownResourceType} ${type}`)
    }

    return {
      text: JSON.stringify(result, null, 2),
    }
  },
}
