/**
 * Storyteller page wire constants — protocol strings for the Writers Room page shell.
 */

import { FsDirectory, HttpMethod } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export enum StorytellerTab {
  Plan = 'plan',
  Board = 'board',
  Script = 'script',
  Relationships = 'relationships',
}

export enum StorytellerThreadId {
  General = 'general',
}

export enum StorytellerStreamMode {
  Events = 'events',
  Nodes = 'nodes',
}

export enum StorytellerMessageRole {
  User = 'User',
  System = 'System',
  Showrunner = 'Showrunner',
}

export enum StorytellerMessageType {
  Human = 'human',
  Ai = 'ai',
}

export enum StorytellerAgentTrigger {
  GenerateEpisodePremise = 'generate_episode_premise',
  GenerateEpisodePremiseSection = 'generate_episode_premise_section',
  GenerateRoadmap = 'generate_roadmap',
}

export enum StorytellerPremiseSection {
  ProtagonistHook = 'protagonistHook',
  FatalFlaw = 'fatalFlaw',
  InevitableConsequence = 'inevitableConsequence',
}

export enum StorytellerPremiseSectionLabel {
  ProtagonistHook = 'Protagonist Hook',
  FatalFlaw = 'Fatal Flaw',
  InevitableConsequence = 'Inevitable Consequence',
}

export enum StorytellerCustomEvent {
  BibleSwitchTab = 'bible-switch-tab',
  NavigateToEntity = 'navigate-to-entity',
  TriggerStoryboard = 'trigger-storyboard-generation',
  GenerateEpisodePoster = 'generate-episode-poster',
  TriggerMoodboard = 'trigger-moodboard-generation',
  MoodboardPrimaryChanged = 'moodboard-primary-changed',
  MoodboardGenerationComplete = 'moodboard-generation-complete',
  TriggerAgentAction = 'trigger-agent-action',
  UpdateEpisodePremise = 'update_episode_premise',
}

export enum StorytellerBibleTab {
  Content = 'content',
  Relationships = 'relationships',
}

export enum StorytellerOverrideState {
  NoBible = 'NO_BIBLE',
  NoEpisodes = 'NO_EPISODES',
  HasEpisodes = 'HAS_EPISODES',
}

export enum StorytellerUnknownLabel {
  Unknown = 'Unknown',
}

export const StorytellerHttpMethod = {
  Post: HttpMethod.Post,
  Patch: HttpMethod.Patch,
  Delete: HttpMethod.Delete,
} as const

export type StorytellerHttpMethod =
  (typeof StorytellerHttpMethod)[keyof typeof StorytellerHttpMethod]

export enum StorytellerQueryParam {
  ProjectId = 'projectId',
  EpisodeId = 'episodeId',
  BeatId = 'beatId',
  Bible = 'bible',
  BibleTab = 'bibleTab',
}

export enum StorytellerBibleQuery {
  Open = 'open',
  Off = 'off',
}

export enum StorytellerAbortError {
  AbortError = 'AbortError',
}

export enum StorytellerWorldBuildingPhase {
  WorldBuilding = 'world_building',
}

export enum StorytellerChatTool {
  CreateCharacter = 'create_character',
  UpdateWorldBible = 'update_world_bible',
  UpdateStoryPhase = 'update_story_phase',
  ManageBeat = 'manage_beat',
  ProposeCharacterFields = 'propose_character_fields',
}

/** Writers Room section id for unsaved character create/edit form fill. */
export enum CharacterDraftChatSection {
  Form = 'character-draft',
}

export enum StorytellerGlobalOperation {
  StorySession = 'story-session',
  StoryAgent = 'story-agent',
  WritersRoom = 'Writers Room',
}

export enum StorytellerPosterType {
  Poster = 'poster',
  Storyboard = 'storyboard',
}

export enum StorytellerLogMessage {
  FailedContinueAfterAnswer = 'Failed to continue after answer:',
  TriggerError = 'Trigger error:',
  FailedSavePhase = 'Failed to save phase:',
  FailedSavePlan = 'Failed to save plan:',
  FailedSaveSequenceUpdate = 'Failed to save sequence update:',
  FailedDraftFirstEpisode = 'Failed to draft first episode:',
  FailedFetchCharacters = 'Failed to fetch characters:',
  FailedFetchBeats = 'Failed to fetch beats:',
  FailedFetchPlan = 'Failed to fetch plan:',
  FailedCreateCharacter = 'Failed to create character:',
  FailedUpdateCharacter = 'Failed to update character:',
  FailedDeleteCharacter = 'Failed to delete character:',
  FailedPersistPremise = 'Failed to persist premise update:',
  FailedRefetchMoodboard = 'Failed to refetch moodboard data:',
  FailedSaveResumedGeneration = 'Failed to save resumed generation:',
  FailedSaveStoryboardUrl = 'Failed to save storyboard URL:',
  FailedSavePosterUrl = 'Failed to save poster URL:',
  FailedSaveMasterPrompt = 'Failed to save master prompt:',
  FailedSaveEpisodePrompt = 'Failed to save episode prompt:',
  FailedSaveGlobalBible = 'Failed to save global bible:',
  FailedSaveBible = 'Failed to save bible:',
  StoryboardGenerationFailed = 'Storyboard generation failed',
  PosterGenerationFailed = 'Poster generation failed',
  CharacterWebNodeClicked = 'Character web node clicked:',
  MoodboardGenerationComplete = '📸 [Moodboard] Generation complete, updating UI:',
  PhaseSyncPremiseToBreaking = '🔄 [Phase Sync] Beats exist but phase is premise - advancing to breaking',
  ApprovalFailed = 'Approval failed',
}

export enum StorytellerPhaseLabel {
  Premise = 'Premise',
  StoryBeats = 'Story Beats',
  Script = 'Script',
  Complete = 'Complete',
}

export enum StorytellerPlanApprovalMessage {
  ApprovedBreaking = '✅ Story plan approved! Now breaking into individual beats...',
}

export enum StorytellerEpisodeSeed {
  FirstTitle = 'Episode 1: The Beginning',
}

export enum StorytellerUserPrompt {
  DraftFirstEpisode =
    'Let\'s draft the first episode. Start by generating a compelling premise for \'Episode 1: The Beginning\'.',
  BuildSeriesFoundation =
    'Let\'s build the series foundation. Help me define the genre, tone, and core rules for this world.',
}

export enum StorytellerActionPrefix {
  Update = 'UPDATE_',
}

export enum StorytellerConfirmVariant {
  Destructive = 'destructive',
}

export enum StorytellerConfirmCopy {
  GoBackTitle = 'Go Back to Previous Phase?',
  GoBackLabel = 'Go Back',
  StayHereLabel = 'Stay Here',
  CancelLabel = 'Cancel',
}

export enum StorytellerBeatStatus {
  Proposed = 'proposed',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum StorytellerBeatTypeDefault {
  Default = 'default',
}

export function labelForPremiseSection(section: string | undefined): string | undefined {
  switch (section) {
    case StorytellerPremiseSection.ProtagonistHook:
      return StorytellerPremiseSectionLabel.ProtagonistHook
    case StorytellerPremiseSection.FatalFlaw:
      return StorytellerPremiseSectionLabel.FatalFlaw
    case StorytellerPremiseSection.InevitableConsequence:
      return StorytellerPremiseSectionLabel.InevitableConsequence
    default:
      return section
  }
}

export enum StorytellerDefaultTitle {
  Untitled = 'Untitled',
  UntitledBeat = 'Untitled beat',
}

export enum StorytellerQuestionFallback {
  UnknownQuestion = 'Unknown question',
}

export enum StorytellerAnswerSeparator {
  CommaSpace = ', ',
}

export enum StorytellerEpisodeStatus {
  Planning = 'planning',
}

export enum StorytellerLegacyPlanField {
  WorldDescription = 'worldDescription',
  Genre = 'genre',
  Tone = 'tone',
  WorldRules = 'worldRules',
  Factions = 'factions',
  KeyCharacters = 'keyCharacters',
  PlotTwists = 'plotTwists',
  Inspirations = 'inspirations',
}

export enum StorytellerTempIdPrefix {
  Temp = 'temp-',
}

export const StorytellerStorageSegment = {
  Public: FsDirectory.Public,
  Projects: FsDirectory.Projects,
  Portraits: 'portraits',
  Episodes: 'episodes',
} as const

export type StorytellerStorageSegment =
  (typeof StorytellerStorageSegment)[keyof typeof StorytellerStorageSegment]

export enum StorytellerImageVariantLabel {
  Cropped = 'cropped',
}

export const StorytellerMoodboardProvider = {
  Midjourney: ImageGenProvider.Midjourney,
  NanoBanana: ImageGenProvider.NanoBanana,
} as const

export type StorytellerMoodboardProvider =
  (typeof StorytellerMoodboardProvider)[keyof typeof StorytellerMoodboardProvider]

export enum StorytellerPosterThemeFallback {
  Cinematic = 'Cinematic',
}

export enum StorytellerGenerationFailLabel {
  Failed = 'Failed',
}

export enum StorytellerGenerationAgentName {
  PosterAgent = 'PosterAgent',
}

export enum StorytellerGenerationAlert {
  GeminiApiKeyMissing = 'Gemini API Key missing! Configure it in your environment.',
  PosterGenerationFailed =
    'Poster generation failed. Please check the API key configuration or try again.',
}

export enum StorytellerGenerationLog {
  StoryboardFailed = 'Storyboard generation failed',
  PosterFailed = 'Poster generation failed',
  LegNextConfigParseFailed = 'Failed to parse LegNext config',
}

export enum StorytellerMoodboardDefault {
  UntitledProject = 'Untitled Project',
  UnknownGenre = 'Unknown genre',
  AtmosphericTone = 'atmospheric',
}

export enum StorytellerMoodboardPromptCategory {
  Environment =
    'Wide establishing shot of the main environment, focusing on scale and atmosphere.',
  DailyLife = 'Street level or interior view showing daily life and culture.',
  CharacterPortrait =
    'Portrait of a typical inhabitant or faction member, highlighting attire and traits.',
}

export enum StorytellerRagEntityType {
  WorldRule = 'world_rule',
}

export enum StorytellerRagQuery {
  WorldLogic = 'important world logic and atmosphere',
}

export enum StorytellerRagSummaryFormat {
  ContextHeader = '\n\n=== ADDITIONAL CONTEXT (RAG) ===\n',
  BulletPrefix = '- ',
  LineBreak = '\n',
}

export enum StorytellerTextSeparator {
  CommaSpace = ', ',
  PeriodSpace = '. ',
}

export enum StorytellerWorkflowVerdict {
  Approve = 'approve',
  Revise = 'revise',
  Kill = 'kill',
}

export enum StorytellerPromptTemplateToken {
  BeatContent = '{beatContent}',
  BeatType = '{beatType}',
  Characters = '{characters}',
  VisualHook = '{visualHook}',
  Setting = '{setting}',
  CanonLock = '{canonLock}',
}

export enum StorytellerBeatTypeFallback {
  Scene = 'scene',
}

export enum StorytellerSettingFallback {
  Unknown = 'Unknown setting',
}

export enum StorytellerPromptAgentInstruction {
  GenerateImagePrompt = 'Generate image prompt',
  GenerateImagePromptSuffix = '\n\nInstructions: Generate the image prompt.',
}

export enum StorytellerGeneratePromptTask {
  Title = 'Generate image prompt',
}
