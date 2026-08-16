/** Writers-room assistant-ui chat constants. */

/** @deprecated Prefer `resolveWritersRoomSuggestions` — kept for callers that need a static fallback. */
export const WRITERS_ROOM_SUGGESTIONS: readonly string[] = [
  'Add an interesting new character to the cast.',
  'Draft the next beat of the story.',
  'Check the story for continuity issues.',
]

/** Chat starter prompts — clicked verbatim into the composer. */
export enum WritersRoomSuggestionPrompt {
  GenerateWorldDescription = 'Generate a rich world description for the storybible.',
  GenerateWorldRules = 'Generate 3–5 fundamental world rules for the storybible. Each needs a short titled name (2–6 words) and the full law in the rule field.',
  GenerateFactions = 'Generate 3–5 major factions for the storybible. Each needs a short titled name (2–6 words) and the full summary in the description field.',
  GeneratePlotTwists = 'Generate 3–5 plot twists for the storybible.',
  GenerateInspirations = 'Generate inspirations (books, movies, games) for the storybible.',
  GenerateThemes = 'Generate core themes for the storybible.',
  CreateBibleCast = 'Create a project-level cast of key characters for the storybible.',
  AddBibleCharacter = 'Add an interesting new character to the storybible cast.',
  CreateFirstEpisode = 'Create the first episode for this project.',
  DraftFirstEpisodePremise = 'Draft a premise for the first episode using the Ozymandias framework.',
  CreateAnotherEpisode = 'Create another episode for this project.',
  DraftNextBeat = 'Draft the next beat of the story.',
  AddCharacter = 'Add an interesting new character to the cast.',
  CheckContinuity = 'Check the story for continuity issues.',
  GenerateEpisodeRoadmap = 'Generate a detailed episode roadmap for the season.',
}

export enum WritersRoomSuggestionStage {
  EmptyBible = 'empty_bible',
  BuildBible = 'build_bible',
  NeedCast = 'need_cast',
  NeedEpisode = 'need_episode',
  HasEpisodesNoSelection = 'has_episodes_no_selection',
  Writing = 'writing',
}

export enum WritersRoomBiblePart {
  WorldDescription = 'worldDescription',
  WorldRules = 'worldRules',
  Factions = 'factions',
  PlotTwists = 'plotTwists',
  Inspirations = 'inspirations',
  Themes = 'themes',
}

export const WRITERS_ROOM_BIBLE_PART_PROMPTS: Readonly<
  Record<WritersRoomBiblePart, WritersRoomSuggestionPrompt>
> = {
  [WritersRoomBiblePart.WorldDescription]: WritersRoomSuggestionPrompt.GenerateWorldDescription,
  [WritersRoomBiblePart.WorldRules]: WritersRoomSuggestionPrompt.GenerateWorldRules,
  [WritersRoomBiblePart.Factions]: WritersRoomSuggestionPrompt.GenerateFactions,
  [WritersRoomBiblePart.PlotTwists]: WritersRoomSuggestionPrompt.GeneratePlotTwists,
  [WritersRoomBiblePart.Inspirations]: WritersRoomSuggestionPrompt.GenerateInspirations,
  [WritersRoomBiblePart.Themes]: WritersRoomSuggestionPrompt.GenerateThemes,
}

/** Max clickable tips shown in the empty composer. */
export const WRITERS_ROOM_SUGGESTION_LIMIT = 3
