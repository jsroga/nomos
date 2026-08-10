/**
 * Domain-specific wire protocol constants (storyteller, loop-creator, assets, etc.).
 */

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
  Atttypmod = 'atttypmod',
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
  InteriorDesigner = '3d-canvas',
  WorldBuilding = '2d-canvas',
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
