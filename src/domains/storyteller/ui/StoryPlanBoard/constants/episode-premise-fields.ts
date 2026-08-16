export enum EpisodePremiseField {
  Title = 'title',
  Logline = 'logline',
  TheHook = 'theHook',
  TheTurn = 'theTurn',
  TheAftermath = 'theAftermath',
  ProtagonistHook = 'protagonistHook',
  FatalFlaw = 'fatalFlaw',
  Stakes = 'stakes',
  Transformation = 'transformation',
  InevitableConsequence = 'inevitableConsequence',
  ThematicFocus = 'thematicFocus',
}

export enum EpisodePremiseCopy {
  UntitledEpisode = 'Untitled Episode',
}

export const EPISODE_PREMISE_RICH_TEXT_FIELDS = [
  EpisodePremiseField.Title,
  EpisodePremiseField.ThematicFocus,
  EpisodePremiseField.Logline,
  EpisodePremiseField.ProtagonistHook,
  EpisodePremiseField.FatalFlaw,
  EpisodePremiseField.Stakes,
  EpisodePremiseField.InevitableConsequence,
] as const
