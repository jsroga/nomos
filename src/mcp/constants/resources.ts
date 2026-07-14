import { ContentType } from '@/shared/data/constants/protocol'

export { ContentType }

export enum McpResourceUri {
  Projects = 'wbk://projects',
  ProjectEntities = 'wbk://project/{projectId}/entities',
  ProjectCharacters = 'wbk://project/{projectId}/characters',
  ProjectEpisodes = 'wbk://project/{projectId}/episodes',
  ProjectSeriesBible = 'wbk://project/{projectId}/series-bible',
  EpisodeBeats = 'wbk://episode/{episodeId}/beats',
}

export enum McpResourceType {
  Projects = 'projects',
  ProjectEntities = 'project-entities',
  ProjectCharacters = 'project-characters',
  ProjectEpisodes = 'project-episodes',
  SeriesBible = 'series-bible',
  EpisodeBeats = 'episode-beats',
}

export enum McpResourceName {
  ProjectsList = 'Projects List',
  ProjectEntities = 'Project Entities',
  ProjectCharacters = 'Project Characters',
  ProjectEpisodes = 'Project Episodes',
  SeriesBible = 'Series Bible',
  EpisodeBeats = 'Episode Beats',
}

export enum McpResourceDescription {
  ProjectsList = 'List of all projects accessible to the current user',
  ProjectEntities = 'All game entities in a project',
  ProjectCharacters = 'All characters in a project',
  ProjectEpisodes = 'All episodes in a project',
  SeriesBible =
    'The series bible for a project containing world description, characters, factions, and story plan',
  EpisodeBeats = 'All beats in an episode',
}

export enum McpResourceAuthError {
  ApiKeyNotSet = 'MCP_API_KEY environment variable not set',
  InvalidApiKey = 'Invalid API key',
}

export enum McpResourceQueryError {
  FailedToFetchProjects = 'Failed to fetch projects:',
  UnknownResourceType = 'Unknown resource type:',
  UnknownResourceUri = 'Unknown resource URI:',
}

export enum McpSupabaseTable {
  Projects = 'projects',
}

export enum McpSupabaseColumn {
  Id = 'id',
  Name = 'name',
  Description = 'description',
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
  UserId = 'user_id',
}

export enum McpSupabaseProjectSelect {
  ListFields = 'id, name, description, created_at, updated_at',
}

export const MCP_RESOURCE_URI_PATTERN = {
  ProjectEntities: /^wbk:\/\/project\/([^/]+)\/entities$/,
  ProjectCharacters: /^wbk:\/\/project\/([^/]+)\/characters$/,
  ProjectEpisodes: /^wbk:\/\/project\/([^/]+)\/episodes$/,
  ProjectSeriesBible: /^wbk:\/\/project\/([^/]+)\/series-bible$/,
  EpisodeBeats: /^wbk:\/\/episode\/([^/]+)\/beats$/,
} as const
