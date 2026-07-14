import { BibleSection } from '@/domains/storyteller/core/types/Enums'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { EpisodePremiseField } from '@/domains/storyteller/ui/StoryPlanBoard/constants/episode-premise-fields'
import { StorytellerLegacyPlanField } from '@/domains/storyteller/core/storyteller-page-wire'

/** Soundtrack field aliases in tool results. */
export enum SoundtrackFieldAlias {
  Soundtracks = 'soundtracks',
  Tracks = 'tracks',
  Music = 'music',
  Soundtrack = 'soundtrack',
}

/** Moodboard field aliases in tool results. */
export enum MoodboardFieldAlias {
  MoodImages = 'moodImages',
  Moodboard = 'moodboard',
}

/** World rules field aliases in tool results. */
export enum WorldRulesFieldAlias {
  WorldRules = 'worldRules',
  Rules = 'rules',
  WorldRulesSnake = 'world_rules',
}

/** World description field aliases in tool results. */
export enum WorldDescriptionFieldAlias {
  WorldDescription = 'worldDescription',
  Description = 'description',
  WorldDescriptionSnake = 'world_description',
  Overview = 'overview',
}

/** Plot twist field aliases in tool results. */
export enum PlotTwistFieldAlias {
  PlotTwists = 'plotTwists',
  Twists = 'twists',
  PlotTwistsSnake = 'plot_twists',
}

/** Episode roadmap field aliases in tool results. */
export enum EpisodeRoadmapFieldAlias {
  Sequences = 'sequences',
  EpisodeRoadmap = 'episodeRoadmap',
  SeasonStructure = 'seasonStructure',
  ExecutiveSummary = 'executiveSummary',
}

/** Episode premise field aliases in tool results. */
export enum EpisodePremiseFieldAlias {
  EpisodePremise = 'episodePremise',
  Premise = 'premise',
}

/** Story plan top-level fields merged into local state. */
export enum StoryPlanMergeField {
  Soundtracks = 'soundtracks',
  WorldRules = 'worldRules',
  Factions = 'factions',
  Cast = 'cast',
  PlotTwists = 'plotTwists',
  Inspirations = 'inspirations',
  WorldDescription = 'worldDescription',
  Genre = 'genre',
  Tone = 'tone',
  Sequences = 'sequences',
  SeasonStructure = 'seasonStructure',
  ExecutiveSummary = 'executiveSummary',
  MoodImages = 'moodImages',
  Moodboard = 'moodboard',
  MasterPrompt = 'masterPrompt',
  CentralTheme = 'centralTheme',
  EpisodeRoadmap = 'episodeRoadmap',
  Items = 'items',
  Events = 'events',
}

export const STORY_PLAN_MERGE_FIELDS: StoryPlanMergeField[] = [
  StoryPlanMergeField.Soundtracks,
  StoryPlanMergeField.WorldRules,
  StoryPlanMergeField.Factions,
  StoryPlanMergeField.Cast,
  StoryPlanMergeField.PlotTwists,
  StoryPlanMergeField.Inspirations,
  StoryPlanMergeField.WorldDescription,
  StoryPlanMergeField.Genre,
  StoryPlanMergeField.Tone,
  StoryPlanMergeField.Sequences,
  StoryPlanMergeField.SeasonStructure,
  StoryPlanMergeField.ExecutiveSummary,
  StoryPlanMergeField.MoodImages,
  StoryPlanMergeField.Moodboard,
  StoryPlanMergeField.MasterPrompt,
  StoryPlanMergeField.CentralTheme,
  StoryPlanMergeField.EpisodeRoadmap,
  StoryPlanMergeField.Items,
  StoryPlanMergeField.Events,
]

/** Section keys recognised in update_world_bible tool args (shimmer + detection). */
export const BIBLE_SECTION_UPDATE_KEYS: string[] = [
  BibleSection.SOUNDTRACKS,
  BibleSection.WORLD_RULES,
  BibleSection.FACTIONS,
  BibleSection.INSPIRATIONS,
  CastFieldAlias.KeyCharacters,
  BibleSection.WORLD_DESCRIPTION,
  BibleSection.PLOT_TWISTS,
  BibleSection.EPISODE_PREMISE,
  BibleSection.EPISODE_ROADMAP,
  EpisodeRoadmapFieldAlias.Sequences,
  EpisodePremiseFieldAlias.Premise,
  CastFieldAlias.Characters,
  CastFieldAlias.Cast,
  EpisodePremiseField.ProtagonistHook,
  EpisodePremiseField.FatalFlaw,
  EpisodePremiseField.Stakes,
  EpisodePremiseField.InevitableConsequence,
  EpisodePremiseField.TheHook,
  EpisodePremiseField.TheTurn,
  EpisodePremiseField.TheAftermath,
  EpisodePremiseField.Transformation,
  EpisodePremiseField.ThematicFocus,
  EpisodePremiseField.Logline,
  EpisodePremiseField.Title,
]

/** Individual premise fields that map to the episodePremise shimmer panel. */
export const PREMISE_SECTION_UPDATE_KEYS: string[] = [
  EpisodePremiseField.ProtagonistHook,
  EpisodePremiseField.FatalFlaw,
  EpisodePremiseField.Stakes,
  EpisodePremiseField.InevitableConsequence,
  EpisodePremiseField.TheHook,
  EpisodePremiseField.TheTurn,
  EpisodePremiseField.TheAftermath,
  EpisodePremiseField.Transformation,
  EpisodePremiseField.ThematicFocus,
  EpisodePremiseField.Logline,
  EpisodePremiseField.Title,
]

export { StorytellerLegacyPlanField }
