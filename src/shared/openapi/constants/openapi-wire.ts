/** Wire strings for public OpenAPI generation (Scalar /api-docs). */

export enum OpenApiDocInfo {
  Title = 'World Building Kit API',
  Version = '1.0.0',
  Description = 'Public REST + MCP HTTP surface. Zod schemas are the contract — regenerate with `npm run openapi:generate`. Agent/tool details: docs/MCP_API.md. SSE chat streams are out of scope.',
}

export enum OpenApiServerUrl {
  RelativeApi = '/api',
  LocalhostApi = 'http://localhost:3000/api',
}

export enum OpenApiServerDescription {
  Relative = 'Same-origin API base',
  Localhost = 'Local development',
}

export enum OpenApiSecuritySchemeName {
  BearerApiKey = 'BearerApiKey',
  SessionCookie = 'SessionCookie',
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

export enum OpenApiRouteDescription {
  McpPost = 'Model Context Protocol endpoint. Tool catalog and auth: docs/MCP_API.md. Requires Bearer API key.',
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
  BearerApiKey = 'MCP / automation API key from POST /api-keys (Authorization: Bearer …)',
  SessionCookie = 'Supabase session cookie used by the workspace UI (withAuth). Exact cookie names vary by Supabase project.',
  BadRequest = 'Bad request',
  Unauthorized = 'Authentication required',
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

