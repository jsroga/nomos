/** Cascade editor wire values. */

export enum CascadeEditorHttpMethod {
  Patch = 'PATCH',
  Post = 'POST',
  Put = 'PUT',
}

export enum CascadeElementType {
  Character = 'character',
  Beat = 'beat',
  Episode = 'episode',
  WorldRule = 'world_rule',
  Premise = 'premise',
}

export enum CascadeEditorError {
  FailedFetchCharacter = 'Failed to fetch character',
  FailedSaveCharacter = 'Failed to save character',
  EpisodeIdRequiredForBeat = 'Episode ID required for beat updates',
  FailedFetchBeats = 'Failed to fetch beats',
  FailedSaveBeat = 'Failed to save beat',
  FailedFetchEpisode = 'Failed to fetch episode',
  FailedSaveEpisode = 'Failed to save episode',
  FailedFetchSeriesBible = 'Failed to fetch series bible',
  FailedSaveWorldRules = 'Failed to save world rules',
  EpisodeIdRequiredForPremise = 'Episode ID required for premise updates',
  FailedFetchPlan = 'Failed to fetch plan',
  FailedSavePremise = 'Failed to save premise',
}
