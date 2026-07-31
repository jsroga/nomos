/** Wire values, prompts, and operator copy for `e2e/scenarios/storyteller-smoke.script.ts`. */

export enum SmokeEvent {
  Start = 'start',
  Complete = 'complete',
  Token = 'token',
  Action = 'action',
  ToolResult = 'tool_result',
  Message = 'message',
}

export enum SmokeTool {
  UpdateWorldBible = 'update_world_bible',
  CreateCharacter = 'create_character',
  AskCharacterQuestions = 'ask_character_questions',
  CheckCharacterExists = 'check_character_exists',
}

export enum SmokeAction {
  UpdateSoundtracks = 'UPDATE_SOUNDTRACKS',
  UpdateWorldRules = 'UPDATE_WORLD_RULES',
  UpdateSeriesBible = 'UPDATE_SERIES_BIBLE',
  UpdateFactions = 'UPDATE_FACTIONS',
  UpdatePlotTwists = 'UPDATE_PLOT_TWISTS',
  CreateCharacter = 'CREATE_CHARACTER',
}

export enum SmokeActionStatus {
  Pending = 'pending',
}

export enum SmokeHttp {
  Post = 'POST',
  BypassAuthValue = 'true',
  SseDataPrefix = 'data: ',
}

export enum SmokeSender {
  Storyteller = 'Storyteller',
}

/** Payload keys read out of untyped action / project JSON. */
export enum SmokeKey {
  WorldRules = 'worldRules',
  PlotTwists = 'plotTwists',
  UpdatedFields = 'updatedFields',
  SeriesBible = 'seriesBible',
  SeriesBibleSnake = 'series_bible',
  StoryPlan = 'storyPlan',
  Category = 'category',
  Rule = 'rule',
  Success = 'success',
  Error = 'error',
}

/** Substrings the assertions match against agent output. */
export enum SmokeMatch {
  ActionUpdatePrefix = 'UPDATE',
  CharacterTool = 'character',
  Rejected = 'REJECTED',
  Magic = 'magic',
}

export enum SmokePrompt {
  Hello = 'Hello',
  UpdateSoundtracks = 'Please update the soundtracks section with epic orchestral music recommendations. Use the update_world_bible tool.',
  AddWorldRules = 'Add some world rules about magic',
  GenerateFactions = 'Generate factions for this world',
  AskNextStep = 'What should I do next with this story?',
  CreateEpisodePremise = 'Create an episode premise using the Ozymandias framework',
  GenerateWorldRules = 'Generate the fundamental laws and rules that govern this world - magic systems, physics, social contracts. Use update_world_bible tool.',
  GeneratePlotTwists = 'Generate 3 major plot twists for this story. Use update_world_bible tool with plotTwists.',
  AskToneAndTheme = 'Tell me about the overall tone and theme of this story so far. What makes it unique?',
  GenerateWorldDescription = 'Generate a brand new rich world description with setting, atmosphere, and key details. Weave in items, events, and world rules as [Name][id] links in the prose.',
  AskUserRulesAboutMagic = 'What do user generated rules say about magic?',
}

export enum SmokeTestName {
  StreamEndpointResponds = 'API: Stream endpoint responds',
  SectionDetectionSoundtracks = 'API: Section detection - soundtracks',
  SectionDetectionWorldRules = 'API: Section detection - world rules',
  ActionEmittedPending = 'API: Action emitted with pending status',
  AskNextStep = 'FLOW: Ask next step gets response',
  GenerateTriggersApproval = 'FLOW: Generate content triggers approval',
  WorldRulesPersist = 'E2E: World Rules - Generate, Approve, Persist',
  PlotTwistsPersist = 'E2E: Plot Twists - Generate, Approve, Persist',
  WorldDescriptionLinkGate = 'E2E: World Description - Link gate & no loop',
  CharacterCreation = 'E2E: Character Creation - Tool & Persistence',
  LinksExtraction = 'E2E: Links Extraction - Entity Auto-Linking',
  GraphRagRetrieval = 'E2E: Graph RAG - Context Retrieval',
}

export enum SmokeLog {
  BannerTitle = '██  STORYTELLER SMOKE TEST',
  BannerSubtitle = '██  Verifying core functionality',
  TestingAgainst = '📡 Testing against:',
  ProjectId = '📁 Project ID:',
  LayerApi = '\n─── LAYER 1: API ───\n',
  LayerFlow = '\n─── LAYER 2: FLOW ───\n',
  LayerPersistence = '\n─── LAYER 3: E2E PERSISTENCE ───\n',
  LayerAdvanced = '\n─── LAYER 4: ADVANCED FEATURES ───\n',
  ResultsHeader = '📊 SMOKE TEST RESULTS',
  SuiteFailed = '❌ SMOKE TEST FAILED - System is NOT ready for deployment',
  SuitePassed = '✅ SMOKE TEST PASSED - Core functionality verified',
  FatalError = 'Fatal error:',

  ToolResults = '  Tool results:',
  AllEvents = '  All Events:',
  Payload = '  Payload:',
  ActionEmitted = '  ✓ Action emitted:',
  ToolCallViaAction = '  ✓ Tool call detected via action event',
  WorldBibleToolCalled = '  ✓ update_world_bible tool called',

  WorldRulesStep1 = '  📤 Step 1: Request world rules generation...',
  WorldRulesStep4 = '  📤 Step 4: Executing action (approval)...',
  WorldRulesStep5 = '  📥 Step 5: Verifying data persistence...',
  ProjectDataKeys = '  Project data keys:',
  SeriesBibleKeys = '  SeriesBible keys:',
  WorldRuleStructureOk = '  ✓ World rule structure validated:',

  PlotTwistsStep1 = '  📤 Step 1: Request plot twists generation...',
  PlotTwistsStep2 = '  📤 Step 2: Executing action (approval)...',
  ActionExecutedPersisted = '  ✓ Action executed and persisted',
  ActionExecutedOk = '  ✓ Action executed successfully',

  SkipPersistenceNoCookie = '  ⚠️  Skipping persistence test (no TEST_AUTH_COOKIE provided)',
  GenerationFlowVerified = '  ✓ Generation flow verified (auth required for persistence)',
  SkipApprovalNoCookie = '  ⚠️  Skipping persistence/approval check (no AUTH_COOKIE)',

  AgentAskedQuestions = '  ✓ Agent correctly switched to "ask_character_questions" (valid flow)',
  CreateCharacterActionSeen = '  ✓ CREATE_CHARACTER action detected',
  CreateCharacterToolCalled = '  ✓ create_character tool called',
  CharacterApprovalStep = '  📤 Step 2: Executing approval for CREATE_CHARACTER action...',
  CharacterApproved = '  ✓ Character creation approved successfully',
  CharacterDirectPersistence = '  ℹ️  No CREATE_CHARACTER action found, assuming direct tool persistence...',
  CharacterVerifyStep = '  📥 Step 3: Verifying character persistence in DB...',

  LinksStep1 = '  📤 Step 1: Asking about a known entity...',
  ResponseLength = '  Response length:',
  LinksDetected = '  ✓ Links detected in response:',
  LinksMissing = '  ⚠️  No links detected. (This might be valid if no entities matched text)',

  WorldDescriptionStart = '  📤 Requesting world description (may reject then accept; must not loop)...',
  GraphRagStep1 = '  📤 Step 1: Asking contextual question (New Conversation)...',
  GraphRagRelevant = '  ✓ Agent provided a relevant answer (Context Retrieved)',
  GraphRagGeneric = '  ⚠️  Agent answer might be generic:',
}

export enum SmokeError {
  NoResponseBody = 'No response body',
  NoStartEvent = 'No start event received',
  NoCompleteEvent = 'No complete event received',
  NoSoundtrackToolOrAction = 'Neither update_world_bible tool nor UPDATE_SOUNDTRACKS action found',
  WorldRulesToolNotCalled = 'update_world_bible tool was not called for world rules',
  NoActionEvent = 'No action event emitted',
  ActionWithoutPayload = 'Action event has no action payload',
  NoTokens = 'No tokens received - agent did not respond',
  StreamIncomplete = 'Stream did not complete',
  GenerationFailed = 'No tool called and no action emitted - generation failed',
  Step1WorldBibleMissing = 'Step 1 FAILED: update_world_bible tool was not called',
  Step2NoWorldRulesAction = 'Step 2 FAILED: No UPDATE_WORLD_RULES or UPDATE_SERIES_BIBLE action emitted',
  Step3NoWorldRulesPayload = 'Step 3 FAILED: Action payload does not contain worldRules array',
  Step5NoPersistedWorldRules = 'Step 5 FAILED: worldRules not found in persisted project data',
  NoPlotTwistsAction = 'No UPDATE_PLOT_TWISTS action emitted',
  NoPlotTwistsPayload = 'Action payload does not contain plotTwists array',
  ActionExecutionUnsuccessful = 'Action execution returned success=false',
  NoCharacterToolOrAction = 'No create_character tool called and no CREATE_CHARACTER action emitted',
  WorldDescriptionToolMissing = 'update_world_bible was never called for world description',
  WorldDescriptionStillRejected = 'Last update_world_bible call was still REJECTED; escape hatch should accept after 2 rejections',
  NoAiContent = 'No AI response content found (checked message and token events)',
}

export enum SmokeDummySuite {
  Describe = 'Dummy suite',
  Test = 'dummy test',
}

export const DEFAULT_BASE_URL = 'http://localhost:3000'
export const DEFAULT_TEST_PROJECT_ID = '168b5a14-11dc-428a-b5a0-67d62dd32b71'
export const LIST_SEPARATOR = ', '
export const EMPTY_JSON_OBJECT = '{}'
/** 2 rejections + 1 accept, plus slack — more than this is a loop. */
export const MAX_WORLD_BIBLE_CALLS = 5
export const DB_PROPAGATION_DELAY_MS = 1000
export const PAYLOAD_LOG_LIMIT = 200
export const GENERIC_ANSWER_MIN_LENGTH = 20
export const GENERIC_ANSWER_LOG_LIMIT = 50
export const LINK_SAMPLE_LIMIT = 3
export const BANNER_WIDTH = 70
