/** Wire values, UI labels, and selectors for the Storyteller whole-flow e2e. */

export enum FlowTool {
  UpdateWorldBible = 'update_world_bible',
  ManageCharacter = 'manage_character',
  RunBeatDraftWorkflow = 'run_beat_draft_workflow',
}

export enum FlowPrompt {
  Hello = 'Hello',
  ChatSuggestion = 'Add an interesting new character to the cast.',
  GenerateBible = 'Update the world bible: set genre to cyberpunk noir and add one world rule that megacorps are above the law. Use the update_world_bible tool.',
  CreateCharacter = 'Create a protagonist named Vex. Use the manage_character tool.',
  GenerateFactions = 'Add one major faction to the world bible: the Neon Syndicate, an underground hacker collective. Use the update_world_bible tool.',
}

export enum FlowUiLabel {
  Send = 'Send',
  Stop = 'Stop',
  Working = 'Working…',
  ComposerPlaceholder = 'Write a message…',
  LoadingProject = 'Loading project...',
  OpenStorybible = 'Open Storybible',
  BibleToggle = 'BIBLE',
  WorldLogic = 'World Logic',
  Factions = 'Factions',
  NoWorldRules = 'No world rules defined yet',
  NoPlotTwists = 'No plot twists revealed yet',
  NoFactions = 'No factions defined. Power is a vacuum.',
  Cast = 'Cast',
  DraftFirstEpisode = 'AI Draft First Episode',
  Episodes = 'Episodes',
  UntitledEpisode = 'Untitled Episode',
  Storyteller = 'Storyteller',
  AssistantMessage = 'assistant-message',
}

export enum FlowSelector {
  AssistantMessage = '.mr-auto.max-w-\\[80\\%\\]',
  UserMessage = '.ml-auto.max-w-\\[80\\%\\]',
  Heading = 'h1',
  Button = 'button',
  Div = 'div',
  TextArea = 'textarea',
  TextPrefix = 'text=',
  ToolPrefix = '🛠 ',
  RunningStatus = '[data-testid="assistant-running-status"]',
}

export enum FlowApi {
  Projects = '/api/storyteller/projects',
  ChatStream = '/api/storyteller/chat/stream',
}

export const BYPASS_AUTH_VALUE = process.env.E2E_BYPASS_AUTH_SECRET ?? ''

export enum FlowHttp {
  BypassAuth = 'x-bypass-auth',
  Post = 'POST',
  ContentType = 'Content-Type',
  Cookie = 'Cookie',
}

export enum FlowSse {
  DataPrefix = 'data: ',
}

export enum FlowCookie {
  NamePrefix = 'sb-',
  NameSuffix = '-auth-token',
}

export enum FlowTest {
  Describe = 'Storyteller',
  Name = 'whole story creation flow',
  ChatName = 'chat responds',
  ProjectNamePrefix = 'E2E Story',
  ProjectDescription = 'Playwright whole-flow test project',
}

export enum FlowTimeout {
  Short = 10_000,
  Medium = 15_000,
  Long = 30_000,
}

export enum FlowKey {
  Enter = 'Enter',
}

export enum FlowRoute {
  NetworkIdle = 'networkidle',
  Load = 'load',
  DomContentLoaded = 'domcontentloaded',
}

export enum FlowCharacter {
  Name = 'Vex',
}

export enum FlowChatRole {
  User = 'user',
}
