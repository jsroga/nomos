export const ACTION_ICON_COMMITTED = '✅'
export const ACTION_ICON_EDIT = '✏️'
export const ACTION_ICON_TRASH = '🗑️'
export const ACTION_ICON_SHUFFLE = '🔀'
export const ACTION_ICON_LOCK = '🔒'
export const ACTION_ICON_PERSON = '👤'
export const ACTION_ICON_STRESS = '📉'
export const ACTION_ICON_BRAIN = '🧠'
export const ACTION_ICON_SCROLL = '📜'
export const ACTION_ICON_PLUS = '➕'
export const ACTION_ICON_NOTE = '📝'
export const ACTION_ICON_BOOK = '📖'
export const ACTION_ICON_BULB = '💡'
export const ACTION_ICON_SCALE = '⚖️'
export const ACTION_ICON_TARGET = '🎯'
export const ACTION_ICON_LINK = '🔗'
export const ACTION_ICON_BOLT = '⚡'

export enum ActionPayloadKey {
  ProjectId = 'projectId',
  EpisodeId = 'episodeId',
  Id = 'id',
  TraceId = 'traceId',
  MergeMode = 'mergeMode',
  CurrentPhase = 'currentPhase',
  Logline = 'logline',
  Name = 'name',
  Role = 'role',
  Updates = 'updates',
  Delta = 'delta',
  Knowledge = 'knowledge',
  Premise = 'premise',
  Rule = 'rule',
  Description = 'description',
  Type = 'type',
  Draft = 'draft',
  RunId = 'runId',
}

export const BIBLE_TECHNICAL_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  ActionPayloadKey.ProjectId,
  ActionPayloadKey.EpisodeId,
  ActionPayloadKey.Id,
  ActionPayloadKey.TraceId,
  ActionPayloadKey.MergeMode,
  ActionPayloadKey.CurrentPhase,
])

export const PREMISE_TECHNICAL_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  ActionPayloadKey.ProjectId,
  ActionPayloadKey.EpisodeId,
  ActionPayloadKey.Id,
  ActionPayloadKey.TraceId,
])

export enum ActionDisplayCopyText {
  CreateBeat = 'Create Beat',
  BeatCreated = 'Beat Created',
  UpdateBeat = 'Update Beat',
  BeatUpdated = 'Beat Updated',
  DeleteBeat = 'Delete Beat',
  BeatDeleted = 'Beat Deleted',
  ReorderBeats = 'Reorder Beats',
  BeatsReordered = 'Beats Reordered',
  LockBeatBoard = 'Lock Beat Board',
  BeatBoardLocked = 'Beat Board Locked',
  CreateCharacter = 'Create Character',
  CharacterCreated = 'Character Created',
  UpdateCharacter = 'Update Character',
  CharacterUpdated = 'Character Updated',
  UpdateStress = 'Update Stress',
  StressUpdated = 'Stress Updated',
  AddKnowledge = 'Add Knowledge',
  KnowledgeAdded = 'Knowledge Added',
  UpdateScript = 'Update Script',
  ScriptUpdated = 'Script Updated',
  InsertSection = 'Insert Section',
  SectionInserted = 'Section Inserted',
  ReviseSection = 'Revise Section',
  SectionRevised = 'Section Revised',
  UpdateBible = 'Update Bible',
  BibleUpdated = 'Bible Updated',
  UpdatePremise = 'Update Premise',
  PremiseUpdated = 'Premise Updated',
  AddWorldRule = 'Add World Rule',
  RuleAdded = 'Rule Added',
  AddSetup = 'Add Setup',
  SetupAdded = 'Setup Added',
  ResolveSetup = 'Resolve Setup',
  SetupResolved = 'Setup Resolved',
  ExecuteAction = 'Execute Action',
  ActionExecuted = 'Action Executed',
  BeatModification = 'Beat modification',
  RemoveBeatFromBoard = 'Remove beat from board',
  ChangeBeatSequence = 'Change beat sequence',
  ReadyForWriting = 'Ready for writing phase',
  FullScriptUpdate = 'Full script content update',
  NewSceneAdded = 'New scene added to script',
  SceneModified = 'Scene content modified',
  PayoffLinkingComplete = 'Payoff linking complete',
  FallbackAction = 'Action',
  Increased = 'increased',
  Decreased = 'decreased',
}

export interface ActionDisplayCopy {
  pendingTitle: string
  committedTitle: string
  pendingIcon: string
  committedIcon: string
  describe: (payload: Record<string, unknown>) => string
}
