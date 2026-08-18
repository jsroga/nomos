/** Wire strings for public OpenAPI generation (Scalar /api-docs). */

export enum OpenApiDocInfo {
  Title = 'nomos.gg API',
  Version = '1.0.0',
  Description = `HTTP API for the nomos.gg game-dev toolkit — narrative, worlds, entities, and 3D generation.

## Authentication

Create a key with \`POST /api-keys\`, then send:

\`Authorization: Bearer YOUR_API_KEY\`

Signed-in workspace sessions also work with Try it in this browser.

## Base URL

All paths are relative to \`/api\`. Production: \`https://nomos.gg/api\`.

## What’s in this reference

- **API Keys** — issue and revoke bearer keys
- **MCP** — Model Context Protocol over HTTP for agents and automations
- **Storyteller** — projects, characters, episodes, beats, bible, plan, and generation jobs
- **Entities** — shared characters, locations, and items
- **World** — tile map read and write
- **3D Canvas** — text-to-3D jobs

Streaming chat and autonomous draft are not part of this REST reference.`,
}

export enum OpenApiDocContact {
  Name = 'nomos.gg',
  Url = 'https://nomos.gg',
  TermsUrl = 'https://nomos.gg/terms',
}

export enum OpenApiServerUrl {
  Production = 'https://nomos.gg/api',
  RelativeApi = '/api',
}

export enum OpenApiServerDescription {
  Production = 'Production',
  Relative = 'This origin',
}

export enum OpenApiSecuritySchemeName {
  BearerApiKey = 'Bearer',
  SessionCookie = 'Session',
}

export enum OpenApiTag {
  Mcp = 'MCP',
  ApiKeys = 'API Keys',
  Entities = 'Entities',
  Storyteller = 'Storyteller',
  World = 'World',
  Canvas3d = '3D Canvas',
}

export enum OpenApiMediaType {
  Json = 'application/json',
}

export enum OpenApiComponentResponse {
  BadRequest = 'BadRequest',
  Unauthorized = 'Unauthorized',
  Forbidden = 'Forbidden',
  NotFound = 'NotFound',
  ServerError = 'ServerError',
}

export enum EntityRelationshipType {
  Uses = 'uses',
  LocatedIn = 'located_in',
  ConflictsWith = 'conflicts_with',
  AlliesWith = 'allies_with',
  Owns = 'owns',
  PartOf = 'part_of',
}

export enum OpenApiTagDescription {
  Mcp = 'JSON-RPC 2.0 over HTTP for AI agents and automations.',
  ApiKeys = 'Issue and revoke bearer API keys.',
  Entities = 'Characters, locations, and items shared across modules.',
  Storyteller = 'Projects, characters, episodes, beats, bible, plan, and generation jobs.',
  World = 'Tile map read and write.',
  Canvas3d = 'Text-to-3D generation jobs.',
}

export enum OpenApiRouteDescription {
  McpPost = 'JSON-RPC 2.0 endpoint for MCP tools. Authenticate with a bearer API key.',
  ApiKeysList = 'Lists the callers MCP API keys (hashes only).',
  ApiKeysCreate = 'Creates a key. Plaintext key is returned once.',
  EntityList = 'Entity list',
  EntityCreated = 'Created entity',
  Entity = 'Entity',
  EntityUpdated = 'Updated entity',
  Deleted = 'Deleted',
  Relationships = 'Relationships',
  RelationshipCreated = 'Created relationship',
  JsonRpcResponse = 'JSON-RPC response',
  ApiKeyList = 'API key list',
  ApiKeyCreated = 'Created API key',
  KeyRevoked = 'Key revoked',
  EpisodeList = 'Episode list',
  EpisodeCreated = 'Created episode',
  LockStatus = 'Lock status',
  TileList = 'Tile list',
  TileUpserted = 'Upserted tile',
  TileDeleted = 'Tile deleted',
  TextTo3dStarted = 'Generation started',
  TextTo3dStatus = 'Generation status',
}

export enum OpenApiRouteSummary {
  McpPost = 'MCP JSON-RPC over HTTP',
  ApiKeysList = 'List API keys',
  ApiKeysCreate = 'Create API key',
  ApiKeysRevoke = 'Revoke API key',
  EntitiesList = 'List entities',
  EntitiesCreate = 'Create entity',
  EntitiesGet = 'Get entity',
  EntitiesUpdate = 'Update entity',
  EntitiesDelete = 'Delete entity',
  RelationshipsList = 'List entity relationships',
  RelationshipsCreate = 'Create entity relationship',
  EpisodesList = 'List episodes',
  EpisodesCreate = 'Create episode',
  BibleLockGet = 'Get World Bible lock status',
  TilesList = 'List tiles',
  TilesUpsert = 'Upsert tile',
  TilesDelete = 'Delete tile',
  TextTo3dStart = 'Start text-to-3D generation',
  TextTo3dPoll = 'Poll text-to-3D status',
}

/** OpenAPI path methods (lowercase — OpenAPI wire, not HTTP verb enums). */
export enum OpenApiHttpMethod {
  Get = 'get',
  Post = 'post',
  Put = 'put',
  Patch = 'patch',
  Delete = 'delete',
}

export enum OpenApiPath {
  Mcp = '/mcp',
  ApiKeys = '/api-keys',
  Entities = '/entities',
  EntityById = '/entities/{entityId}',
  EntityRelationships = '/entities/relationships',
  StorytellerEpisodes = '/storyteller/episodes',
  StorytellerBibleLock = '/storyteller/bible/lock',
  WorldTiles = '/world/tiles',
  Canvas3dTextTo3d = '/3d-canvas/text-to-3d',
  Canvas3dTextTo3dTask = '/3d-canvas/text-to-3d/{taskId}',
}

export enum OpenApiSchemaName {
  ErrorBody = 'ErrorBody',
  SuccessMessage = 'SuccessMessage',
  CreateApiKeyRequest = 'CreateApiKeyRequest',
  ApiKeyListItem = 'ApiKeyListItem',
  ApiKeyListResponse = 'ApiKeyListResponse',
  ApiKeyCreateResponse = 'ApiKeyCreateResponse',
  ApiKeyDeleteQuery = 'ApiKeyDeleteQuery',
  ListEntitiesQuery = 'ListEntitiesQuery',
  CreateEntityRequest = 'CreateEntityRequest',
  UpdateEntityRequest = 'UpdateEntityRequest',
  GameEntity = 'GameEntity',
  EntitiesListResponse = 'EntitiesListResponse',
  EntityResponse = 'EntityResponse',
  EntityIdParams = 'EntityIdParams',
  ListRelationshipsQuery = 'ListRelationshipsQuery',
  CreateRelationshipRequest = 'CreateRelationshipRequest',
  EntityRelationship = 'EntityRelationship',
  RelationshipsListResponse = 'RelationshipsListResponse',
  RelationshipResponse = 'RelationshipResponse',
  McpJsonRpcRequest = 'McpJsonRpcRequest',
  McpJsonRpcResponse = 'McpJsonRpcResponse',
  StorytellerEpisodesQuery = 'StorytellerEpisodesQuery',
  StorytellerCreateEpisodeRequest = 'StorytellerCreateEpisodeRequest',
  StorytellerEpisodesResponse = 'StorytellerEpisodesResponse',
  StorytellerEpisodeResponse = 'StorytellerEpisodeResponse',
  StorytellerBibleLockQuery = 'StorytellerBibleLockQuery',
  StorytellerBibleLockResponse = 'StorytellerBibleLockResponse',
  ListTilesQuery = 'ListTilesQuery',
  UpsertTileRequest = 'UpsertTileRequest',
  DeleteTileRequest = 'DeleteTileRequest',
  TileListResponse = 'TileListResponse',
  TileResponse = 'TileResponse',
  InteriorTextTo3DRequest = 'InteriorTextTo3DRequest',
  InteriorTextTo3DResponse = 'InteriorTextTo3DResponse',
  InteriorTaskParams = 'InteriorTaskParams',
  InteriorTextTo3DStatusResponse = 'InteriorTextTo3DStatusResponse',
}

export enum OpenApiComponentDescription {
  BearerApiKey = 'Create a key with POST /api-keys, then send it as a Bearer token in the Authorization header.',
  SessionCookie = 'Signed-in workspace session. Try it works in this browser after you log in.',
  BadRequest = 'Bad request',
  Unauthorized = 'Authentication required',
  Forbidden = 'Forbidden',
  NotFound = 'Not found',
  ServerError = 'Server error',
}

export enum OpenApiSchemaFieldNote {
  ApiKeyPlaintextOnce = 'Plaintext key — shown only once',
}

export enum OpenApiJsonRpcVersion {
  V2 = '2.0',
}

export enum OpenApiApiKeyDefaultScope {
  All = '*',
}

export enum OpenApiCookieName {
  SupabaseAccessToken = 'sb-access-token',
}

export enum OpenApiComponentKind {
  SecuritySchemes = 'securitySchemes',
  Responses = 'responses',
}

export enum OpenApiSecuritySchemeType {
  Http = 'http',
  ApiKey = 'apiKey',
}

export enum OpenApiSecuritySchemeIn {
  Cookie = 'cookie',
}

export enum OpenApiHttpAuthScheme {
  Bearer = 'bearer',
}

export enum OpenApiBearerFormat {
  ApiKey = 'API Key',
}

export enum OpenApiRefPrefix {
  Schemas = '#/components/schemas/',
  Responses = '#/components/responses/',
}

