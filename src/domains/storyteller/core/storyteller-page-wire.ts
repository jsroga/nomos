/**
 * Storyteller page wire constants — protocol strings for the Writers Room page shell.
 */
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

export enum StorytellerHttpMethod {
  Post = 'POST',
  Patch = 'PATCH',
  Delete = 'DELETE',
}

export enum StorytellerQueryParam {
  EpisodeId = 'episodeId',
  Bible = 'bible',
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
  FailedRefetchMoodboard = 'Failed to refetch moodboard data:',
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
  DraftFirstEpisode = "Let's draft the first episode. Start by generating a compelling premise for 'Episode 1: The Beginning'.",
  BuildSeriesFoundation = "Let's build the series foundation. Help me define the genre, tone, and core rules for this world.",
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
