/** Storyteller module config wire values and prompt identifiers. */

export enum EnvFlagValue {
  True = 'true',
  False = 'false',
}

export enum GuardrailSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export enum StorytellerPromptEnvironment {
  Production = 'production',
  Staging = 'staging',
  Dev = 'dev',
}

export enum StorytellerPromptHubOwner {
  Tilemap = 'tilemap',
}

export enum StorytellerPromptId {
  Supervisor = 'storyteller-supervisor',
  PlotArchitect = 'storyteller-plot-architect',
  Writer = 'storyteller-writer',
  PremiseArchitect = 'storyteller-premise-architect',
  CharacterPsychology = 'storyteller-character-psychology',
  DevilsAdvocate = 'storyteller-devils-advocate',
  ScriptEditor = 'storyteller-script-editor',
  ConsequenceTracker = 'storyteller-consequence-tracker',
  EpisodePremiseArchitect = 'storyteller-episode-premise-architect',
  Planner = 'storyteller-planner',
  MagicAgent = 'storyteller-magic-agent',
  WorldSimulator = 'storyteller-world-simulator',
  VisualMoment = 'storyteller-visual-moment',
  SectionWorldDescription = 'storyteller-section-world-description',
  SectionWorldRules = 'storyteller-section-world-rules',
  SectionFactions = 'storyteller-section-factions',
  SectionInspirations = 'storyteller-section-inspirations',
  SectionPlotTwists = 'storyteller-section-plot-twists',
  SectionEpisodeRoadmap = 'storyteller-section-episode-roadmap',
  SectionKeyCharacters = 'storyteller-section-key-characters',
  SectionSoundtracks = 'storyteller-section-soundtracks',
}

export const STORYTELLER_PROMPT_ENVIRONMENTS: StorytellerPromptEnvironment[] = [
  StorytellerPromptEnvironment.Production,
  StorytellerPromptEnvironment.Staging,
  StorytellerPromptEnvironment.Dev,
]

export const PROMPT_IDS = {
  supervisor: StorytellerPromptId.Supervisor,
  plotArchitect: StorytellerPromptId.PlotArchitect,
  writer: StorytellerPromptId.Writer,
  premiseArchitect: StorytellerPromptId.PremiseArchitect,
  characterPsychology: StorytellerPromptId.CharacterPsychology,
  devilsAdvocate: StorytellerPromptId.DevilsAdvocate,
  scriptEditor: StorytellerPromptId.ScriptEditor,
  consequenceTracker: StorytellerPromptId.ConsequenceTracker,
  episodePremiseArchitect: StorytellerPromptId.EpisodePremiseArchitect,
  planner: StorytellerPromptId.Planner,
  magicAgent: StorytellerPromptId.MagicAgent,
  worldSimulator: StorytellerPromptId.WorldSimulator,
  visualMoment: StorytellerPromptId.VisualMoment,
  sectionWorldDescription: StorytellerPromptId.SectionWorldDescription,
  sectionWorldRules: StorytellerPromptId.SectionWorldRules,
  sectionFactions: StorytellerPromptId.SectionFactions,
  sectionInspirations: StorytellerPromptId.SectionInspirations,
  sectionPlotTwists: StorytellerPromptId.SectionPlotTwists,
  sectionEpisodeRoadmap: StorytellerPromptId.SectionEpisodeRoadmap,
  sectionKeyCharacters: StorytellerPromptId.SectionKeyCharacters,
  sectionSoundtracks: StorytellerPromptId.SectionSoundtracks,
} as const
