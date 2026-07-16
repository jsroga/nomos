/**
 * Wire protocol constants — HTTP, API errors, headers.
 * Use these instead of inline string literals in routes and services.
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
}

export enum MeshyArtStyle {
  Realistic = 'realistic',
}

export enum MeshyTopology {
  Triangle = 'triangle',
}

export enum GoogleModelId {
  Gemini3ProImagePreview = 'gemini-3-pro-image-preview',
}

export enum FsDirectory {
  Public = 'public',
  Projects = 'projects',
  Assets = 'assets',
}

export enum OpenAiResponseFormat {
  JsonObject = 'json_object',
}

export enum OpenAiModel {
  Gpt4o = 'gpt-4o',
  Gpt4oMini = 'gpt-4o-mini',
}

export enum GoogleModel {
  Gemini20Flash = 'gemini-2.0-flash',
}

export enum BufferEncoding {
  Base64 = 'base64',
}

export enum AuthBypassValue {
  System = 'system',
}

export enum ActionApiResultType {
  BIBLE_UPDATED = 'bible_updated',
  EPISODE_UPDATED = 'episode_updated',
  BEAT_CREATED = 'beat_created',
  BEAT_UPDATED = 'beat_updated',
  BEAT_DELETED = 'beat_deleted',
  BEAT_REORDERED = 'beat_reordered',
  CHARACTER_CREATED = 'character_created',
  CHARACTER_UPDATED = 'character_updated',
  SCRIPT_UPDATED = 'script_updated',
  ACKNOWLEDGED = 'acknowledged',
}

export enum BooleanQueryValue {
  True = 'true',
}

export enum CharacterRole {
  Lead = 'Lead',
  Supporting = 'Supporting',
  Background = 'Background',
  SupportingLower = 'supporting',
}

export enum CrossDomainSuggestionType {
  CrossDomain = 'cross_domain',
}

export enum CrossDomainSuggestionCopy {
  LoopToStoryDescription = 'Create narrative scenarios that showcase this mechanic',
  LoopToLevelDescription = 'Create environments that leverage this mechanic',
  CharToMechanicsDescription = 'Create gameplay systems and abilities for this character',
  CharToHomeDescription = 'Design the character\'s living space in 3D',
}

export enum GameEntityTag {
  GameLoop = 'game-loop',
}

export enum MeshyTaskStatus {
  Pending = 'PENDING',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
}

export enum Hyper3dTaskStatus {
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum ImageMimeType {
  Png = 'image/png',
  Jpeg = 'image/jpeg',
}

export enum ImageFileExtension {
  Png = '.png',
}

export enum JsonImageUrlType {
  Base64 = 'base64',
  Url = 'url',
}

export enum RelationshipGraphEdgeType {
  Associated = 'associated',
  MemberOf = 'member_of',
  Rival = 'rival',
}

export enum RelationshipEdgeLabel {
  Connected = 'Connected',
  Affiliated = 'Affiliated',
  LocatedIn = 'Located in',
  Member = 'Member',
  Rivals = 'Rivals',
  CoMentioned = 'Co-mentioned',
}

export enum RelationshipNodeSource {
  EntityRegistry = 'entity_registry',
  CharactersTable = 'characters_table',
  StoryPlan = 'story_plan',
}

export enum GraphNodeIdPrefix {
  Character = 'character-',
  Faction = 'faction-',
}

export enum SqlResultColumn {
  SourceType = 'source_type',
  TargetType = 'target_type',
  Similarity = 'similarity',
  SourceId = 'source_id',
  TargetId = 'target_id',
}

export enum BibleCategoryKey {
  General = 'General',
  Setting = 'Setting',
  History = 'History',
  Magic = 'Magic',
  Factions = 'Factions',
  Technology = 'Technology',
  Culture = 'Culture',
}

export enum StoryPlanFieldKey {
  Genre = 'genre',
  Tone = 'tone',
  CentralTheme = 'centralTheme',
  WorldDescription = 'worldDescription',
  WorldRules = 'worldRules',
  Factions = 'factions',
  Inspirations = 'inspirations',
  KeyCharacters = 'keyCharacters',
  Sequences = 'sequences',
  ExecutiveSummary = 'executiveSummary',
  Soundtracks = 'soundtracks',
  PlotTwists = 'plotTwists',
  StyleReference = 'styleReference',
}

export enum ScriptReviewMode {
  Quick = 'quick',
  Full = 'full',
}

export enum LoopCreatorStreamEventType {
  Node = 'node',
  Message = 'message',
  Action = 'action',
  Questions = 'questions',
  Token = 'token',
  Error = 'error',
  Start = 'start',
  State = 'state',
  Complete = 'complete',
}

export enum LoopCreatorChatRole {
  User = 'user',
}

export enum LoopCreatorChatPhase {
  Ideation = 'ideation',
}

export enum LoopCreatorServiceId {
  LoopCreator = 'loop-creator',
  Mastra = 'mastra',
}

export enum AppModuleId {
  Storyteller = 'storyteller',
  LoopCreator = 'loop-creator',
  InteriorDesigner = 'interior-designer',
  WorldBuilding = 'world-building',
}

export enum GameEntityKind {
  Character = 'character',
  Location = 'location',
  Mechanic = 'mechanic',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
}

export enum ApiRoutePath {
  Entities = '/api/entities',
  ProxyModel = '/api/proxy-model',
}

export enum LoopCreatorHealthStatus {
  Ok = 'ok',
}

export enum MidjourneyTaskStatus {
  Success = 'SUCCESS',
  Failed = 'FAILED',
}

export enum MidjourneyBotType {
  MidJourney = 'MID_JOURNEY',
}

export enum MidjourneyAccountMode {
  Fast = 'FAST',
}

export enum MidjourneyButtonLabel {
  U1 = 'U1',
}

export enum MidjourneyUpsampleId {
  Upsample1 = 'upsample::1',
}

export enum EntityAutoRegisterStatus {
  Discovered = 'discovered',
}

export enum EntityAutoRegisterFallback {
  Rule = 'Rule',
  None = '(none)',
}

export enum EmotionalStateDefault {
  Neutral = 'neutral',
}

export enum CentralityFallback {
  None = 'none',
}

export enum SecureLogMessage {
  PathTraversalBlocked = 'Path traversal attempt blocked',
}

export enum Generate3dPathPrefix {
  Projects = '/projects/',
}

export enum SseCacheControl {
  NoCacheNoTransform = 'no-cache, no-transform',
}

export enum SseAccelBuffering {
  No = 'no',
}

export enum ScriptReviewApiDoc {
  Endpoint = '/api/storyteller/script-review',
  Description = 'Review scripts using three legendary storyteller personas',
  GeorgeFocus = 'Character depth, consequences, moral complexity, world texture',
  VinceFocus = 'Visual storytelling, transformation arcs, rigorous logic, blocking',
  LynchFocus = 'Atmosphere, dream logic, the uncanny, soundscapes',
  SampleScript = 'Your script content here...',
  SampleEpisodeTitle = 'Episode Title',
  SampleEllipsis = '...',
  SampleCharacter = 'Character',
  SampleProtagonist = 'Protagonist',
  PersonaChoices = 'george-rr-martin | vince-gilligan | david-lynch',
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
