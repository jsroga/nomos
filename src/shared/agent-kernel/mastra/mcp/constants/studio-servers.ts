export const STUDIO_MCP_NOTE =
  'Registered for Mastra Studio. Full side effects run in the app MCP runtime (stdio or /api/mcp).'

export enum StudioMcpToolInputCopy {
  FreeformInput = 'Freeform tool input for Studio testing',
}

export enum StudioMcpToolId {
  ListEntities = 'list_entities',
  GetEntity = 'get_entity',
  CreateEntity = 'create_entity',
  UpdateEntity = 'update_entity',
  DeleteEntity = 'delete_entity',
  ListCharacters = 'list_characters',
  GetCharacter = 'get_character',
  CreateCharacter = 'create_character',
  UpdateCharacter = 'update_character',
  DeleteCharacter = 'delete_character',
  ListEpisodes = 'list_episodes',
  ListBeats = 'list_beats',
  GetSeriesBible = 'get_series_bible',
  StorytellerChat = 'storyteller_chat',
  GenerateTile = 'generate_tile',
  UpscaleTile = 'upscale_tile',
  Generate3dModel = 'generate_3d_model',
  Remesh3dModel = 'remesh_3d_model',
  GeneratePortrait = 'generate_portrait',
  GetRunStatus = 'get_run_status',
  CancelRun = 'cancel_run',
  WaitForRun = 'wait_for_run',
}

export enum StudioMcpToolDescription {
  ListEntities = 'List game entities for a project with optional filters.',
  GetEntity = 'Get a single game entity by ID.',
  CreateEntity = 'Create a new game entity.',
  UpdateEntity = 'Update an existing game entity.',
  DeleteEntity = 'Delete a game entity.',
  ListCharacters = 'List all characters in a project.',
  GetCharacter = 'Get a single character by ID.',
  CreateCharacter = 'Create a new character in a project.',
  UpdateCharacter = 'Update an existing character.',
  DeleteCharacter = 'Delete a character.',
  ListEpisodes = 'List episodes for a project.',
  ListBeats = 'List beats for an episode.',
  GetSeriesBible = 'Get the series bible for a project.',
  StorytellerChat = 'Send a message to the storyteller agent.',
  GenerateTile = 'Generate a world tile image.',
  UpscaleTile = 'Upscale a generated tile.',
  Generate3dModel = 'Generate a 3D model from an image or prompt.',
  Remesh3dModel = 'Remesh an existing 3D model.',
  GeneratePortrait = 'Generate a character portrait.',
  GetRunStatus = 'Get status of a Trigger.dev run.',
  CancelRun = 'Cancel a Trigger.dev run.',
  WaitForRun = 'Wait for a Trigger.dev run to complete.',
}

export const STUDIO_MCP_TOOL_CATALOG: ReadonlyArray<
  readonly [StudioMcpToolId, StudioMcpToolDescription]
> = [
  [StudioMcpToolId.ListEntities, StudioMcpToolDescription.ListEntities],
  [StudioMcpToolId.GetEntity, StudioMcpToolDescription.GetEntity],
  [StudioMcpToolId.CreateEntity, StudioMcpToolDescription.CreateEntity],
  [StudioMcpToolId.UpdateEntity, StudioMcpToolDescription.UpdateEntity],
  [StudioMcpToolId.DeleteEntity, StudioMcpToolDescription.DeleteEntity],
  [StudioMcpToolId.ListCharacters, StudioMcpToolDescription.ListCharacters],
  [StudioMcpToolId.GetCharacter, StudioMcpToolDescription.GetCharacter],
  [StudioMcpToolId.CreateCharacter, StudioMcpToolDescription.CreateCharacter],
  [StudioMcpToolId.UpdateCharacter, StudioMcpToolDescription.UpdateCharacter],
  [StudioMcpToolId.DeleteCharacter, StudioMcpToolDescription.DeleteCharacter],
  [StudioMcpToolId.ListEpisodes, StudioMcpToolDescription.ListEpisodes],
  [StudioMcpToolId.ListBeats, StudioMcpToolDescription.ListBeats],
  [StudioMcpToolId.GetSeriesBible, StudioMcpToolDescription.GetSeriesBible],
  [StudioMcpToolId.StorytellerChat, StudioMcpToolDescription.StorytellerChat],
  [StudioMcpToolId.GenerateTile, StudioMcpToolDescription.GenerateTile],
  [StudioMcpToolId.UpscaleTile, StudioMcpToolDescription.UpscaleTile],
  [StudioMcpToolId.Generate3dModel, StudioMcpToolDescription.Generate3dModel],
  [StudioMcpToolId.Remesh3dModel, StudioMcpToolDescription.Remesh3dModel],
  [StudioMcpToolId.GeneratePortrait, StudioMcpToolDescription.GeneratePortrait],
  [StudioMcpToolId.GetRunStatus, StudioMcpToolDescription.GetRunStatus],
  [StudioMcpToolId.CancelRun, StudioMcpToolDescription.CancelRun],
  [StudioMcpToolId.WaitForRun, StudioMcpToolDescription.WaitForRun],
]

export enum StudioMcpResourceUri {
  Projects = 'wbk://projects',
  ProjectEntities = 'wbk://project/{projectId}/entities',
  ProjectCharacters = 'wbk://project/{projectId}/characters',
  ProjectEpisodes = 'wbk://project/{projectId}/episodes',
  ProjectSeriesBible = 'wbk://project/{projectId}/series-bible',
  EpisodeBeats = 'wbk://episode/{episodeId}/beats',
}

export enum StudioMcpResourceName {
  Projects = 'Projects',
  ProjectEntities = 'Project Entities',
  ProjectCharacters = 'Project Characters',
  ProjectEpisodes = 'Project Episodes',
  SeriesBible = 'Series Bible',
  EpisodeBeats = 'Episode Beats',
}

export enum StudioMcpResourceDescription {
  Projects = 'List all projects accessible to the API key',
  ProjectEntities = 'List entities for a project',
  ProjectCharacters = 'List characters for a project',
  ProjectEpisodes = 'List episodes for a project',
  SeriesBible = 'Get the series bible for a project',
  EpisodeBeats = 'List beats for an episode',
}

export enum StudioMcpServerId {
  WorldBuildingKit = 'world-building-kit',
}

export enum StudioMcpServerName {
  WorldBuildingKit = 'World Building Kit',
}

export enum StudioMcpServerVersion {
  V1 = '1.0.0',
}

export enum StudioMcpServerDescription {
  WorldBuildingKit =
    'MCP server for World Building Kit — entities, storyteller, generation, and Trigger.dev runs.',
}

export enum StudioMcpServerInstructions {
  Default =
    'Use MCP_API_KEY for auth. Studio exposes tool/resource metadata; run `npm run mcp:start` or POST /api/mcp for live execution.',
}

export enum StudioMcpTransportType {
  Streamable = 'streamable',
}
