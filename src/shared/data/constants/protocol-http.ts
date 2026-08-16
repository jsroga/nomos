/**
 * HTTP, transport, and infrastructure wire constants.
 */

export enum ApiErrorMessage {
  UNAUTHORIZED = 'Unauthorized',
  INVALID_ACTION = 'Invalid action',
  PROJECT_NOT_FOUND = 'Project not found or access denied',
  EPISODE_NOT_FOUND = 'Episode not found or access denied',
  PROJECT_ID_REQUIRED = 'Project ID required',
  EPISODE_ID_REQUIRED = 'Episode ID required',
  INTERNAL_ERROR = 'Internal server error',
}

export enum HttpHeader {
  TRACE_ID = 'x-trace-id',
  BYPASS_AUTH = 'x-bypass-auth',
}

export enum QueryParam {
  RunId = 'runId',
  ProjectId = 'projectId',
  Id = 'id',
  EntityId = 'entityId',
  RelationshipId = 'relationshipId',
  LoopId = 'loopId',
  BeatId = 'beatId',
  CharacterId = 'characterId',
  EpisodeId = 'episodeId',
  Ids = 'ids',
  EnrichRelationships = 'enrichRelationships',
  Refresh = 'refresh',
  Context = 'context',
}

export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL = 500,
}

export enum NextRuntime {
  NodeJs = 'nodejs',
  Edge = 'edge',
}

export enum NextDynamic {
  ForceDynamic = 'force-dynamic',
}

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
  Head = 'HEAD',
  Patch = 'PATCH',
  Delete = 'DELETE',
}

export enum HttpAuthScheme {
  Bearer = 'Bearer ',
}

export enum HttpHeaderName {
  Authorization = 'authorization',
}

export enum SseHeader {
  ContentType = 'text/event-stream',
  CacheControl = 'no-cache',
  Connection = 'keep-alive',
}

export enum BlobAccess {
  Public = 'public',
}

export enum SharpFit {
  Cover = 'cover',
  Fill = 'fill',
}

export enum SharpPosition {
  Center = 'center',
}

export enum FormField {
  File = 'file',
  ProjectId = 'projectId',
  AssetId = 'assetId',
  UpdateExisting = 'updateExisting',
  DesignId = 'designId',
  EntityId = 'entityId',
}

export enum ContentType {
  Json = 'application/json',
  OctetStream = 'application/octet-stream',
  GltfBinary = 'model/gltf-binary',
  Usdz = 'model/vnd.usdz+zip',
  PlainText = 'text/plain',
  Png = 'image/png',
}

export enum CacheControl {
  PublicMaxAge86400 = 'public, max-age=86400',
}

export enum ModelFileExtension {
  Glb = '.glb',
  Gltf = '.gltf',
  Fbx = '.fbx',
  Obj = '.obj',
  Usdz = '.usdz',
}

export enum ProxyAllowedHost {
  AssetsMeshy = 'assets.meshy.ai',
  CdnMeshy = 'cdn.meshy.ai',
  GoogleStorage = 'storage.googleapis.com',
  Supabase = 'supabase.co',
}

export enum QueryParamKey {
  Url = 'url',
  UserId = 'userId',
}

export enum TriggerTaskTtl {
  UpscaleTile = '25m',
}

export enum SupabaseAuthRole {
  Authenticated = 'authenticated',
}

export enum SupabaseTokenType {
  Bearer = 'bearer',
}

export enum AuthBypassFlag {
  True = 'true',
}

export enum DomEventType {
  Error = 'error',
  KeyDown = 'keydown',
  UnhandledRejection = 'unhandledrejection',
  Wheel = 'wheel',
}

export enum KeyboardKey {
  Enter = 'Enter',
  Escape = 'Escape',
}

export enum DomTagName {
  Input = 'INPUT',
  Textarea = 'TEXTAREA',
}

export enum HtmlElementType {
  Button = 'button',
}

export enum StringSeparator {
  CommaSpace = ', ',
  DotSpace = '. ',
  SemicolonSpace = '; ',
  NewlineBlock = '\n---\n',
  DoubleNewline = '\n\n',
}

export enum UrlScheme {
  Http = 'http',
  Https = 'https',
  Data = 'data:',
}

export enum FetchCache {
  NoStore = 'no-store',
}

export enum JsonField {
  Url = 'url',
  Base64 = 'base64',
}

export enum ReplicateOutputMethod {
  GetReader = 'getReader',
}

export enum MastraWorkflowStatus {
  Suspended = 'suspended',
  Failed = 'failed',
}

export enum TriggerRunStatus {
  Unknown = 'unknown',
  NotFound = 'NOT_FOUND',
  Queued = 'queued',
}

export enum OpenAiChatRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

export enum ErrorFragment {
  NotFound = 'not found',
}

export enum FileEncoding {
  Utf8 = 'utf-8',
}

export enum ModelProvider {
  Meshy = 'meshy',
  Hyper3d = 'hyper3d',
}

export enum EnvVarName {
  MeshyApiKey = 'MESHY_API_KEY',
  Hyper3dApiKey = 'HYPER3D_API_KEY',
  GoogleApiKey = 'GOOGLE_API_KEY',
  OpenRouterApiKey = 'OPENROUTER_API_KEY',
  ReplicateApiToken = 'REPLICATE_API_TOKEN',
  E2eBypassAuthSecret = 'E2E_BYPASS_AUTH_SECRET',
  BasicAuthUser = 'BASIC_AUTH_USER',
  BasicAuthPassword = 'BASIC_AUTH_PASSWORD',
}

export enum MeshyArtStyle {
  Realistic = 'realistic',
}

export enum MeshyTopology {
  Triangle = 'triangle',
}

export enum GoogleModelId {
  Gemini3ProImagePreview = 'gemini-3-pro-image-preview',
  Gemini20FlashPreviewImageGeneration = 'gemini-2.0-flash-preview-image-generation',
  Gemini20Flash = 'gemini-2.0-flash',
}

export enum FsDirectory {
  Public = 'public',
  Projects = 'projects',
  Assets = 'assets',
}

export enum OpenAiResponseFormat {
  JsonObject = 'json_object',
}

/** Fast text model id for OpenRouter OpenAI-compatible clients (`provider/model`). */
export enum OpenAiModel {
  Gpt56Luna = 'openai/gpt-5.6-luna',
}

/** @deprecated Use {@link GoogleModelId.Gemini20Flash} */
export enum GoogleModel {
  Gemini20Flash = 'gemini-2.0-flash',
}

export enum BufferEncoding {
  Base64 = 'base64',
}

export enum AuthBypassValue {
  System = 'system',
}

export enum SseCacheControl {
  NoCacheNoTransform = 'no-cache, no-transform',
}

export enum SseAccelBuffering {
  No = 'no',
}

export enum SupabaseTable {
  SeriesBibles = 'series_bibles',
  EntityRelationships = 'entity_relationships',
}

export enum SupabaseColumn {
  ProjectId = 'project_id',
  BibleLockSelect = 'is_locked, locked_by, locked_at',
}

export enum AssetMetadataType {
  Model = 'model',
  Image = 'image',
}

export enum AssetUploadFilename {
  Placeholder = 'placeholder.png',
  ThumbSuffix = '_thumb.png',
}

export enum DialogConfirmVariant {
  Destructive = 'destructive',
}

export enum ImageFileExtensionPattern {
  JpgJpegPngWebp = '.(jpg|jpeg|png|webp)$',
}
