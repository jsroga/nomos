export const POSTER_LLM_TASK = 'poster-generation'

export enum GeneratePosterStage {
  Initializing = 'initializing',
  BuildingPrompt = 'building_prompt',
  Generating = 'generating',
  Selecting = 'selecting_variant',
  Upsampling = 'upsampling',
  Downloading = 'downloading',
  Saving = 'saving',
  UpdatingDb = 'updating_database',
  Completed = 'completed',
}

export enum GeneratePosterProgress {
  Init = 0,
  BuildingPrompt = 12,
  Generating = 30,
  Selecting = 50,
  Upsampling = 65,
  Downloading = 80,
  Saving = 88,
  UpdatingDb = 94,
  Completed = 100,
}

export enum GeneratePosterMetadataKey {
  Progress = 'progress',
  Stage = 'stage',
  ProjectId = 'project_id',
  EpisodeId = 'episode_id',
  Prompt = 'prompt',
}

export enum GeneratePosterLog {
  Starting = 'Starting poster generation',
  BuildingPrompt = 'Building locked episode poster prompt',
  Saved = 'Poster saved',
  DbUpdated = 'Episode poster_url updated',
  DbFailed = 'Failed to update episode in DB',
}

export enum GeneratePosterError {
  ProjectIdRequired = 'projectId and episodeId are required',
  ApiframeKeyRequired = 'Apiframe API key is required',
  DownloadFailedPrefix = 'Failed to download image from URL:',
  DbUpdateFailed = 'Database update failed',
  OpenRouterRequired = 'OPENROUTER_API_KEY is not configured',
  OverviewRequired = 'World description is required before generating a poster',
  PromptBuildFailed = 'Failed to build episode poster prompt',
  EpisodeNotFound = 'Episode not found when writing poster_url',
}

export enum GeneratePosterFilename {
  Prefix = 'poster',
}

export enum GeneratePosterTable {
  Episodes = 'episodes',
}

export enum GeneratePosterColumn {
  Id = 'id',
  PosterUrl = 'poster_url',
  PosterPrompt = 'poster_prompt',
  UpdatedAt = 'updated_at',
  StoryPlan = 'story_plan',
}

export enum GeneratePosterPlanField {
  PosterUrl = 'posterUrl',
}

export enum EpisodePosterVariantCopy {
  Instruction =
    'This is a Midjourney 2x2 grid. 1 is top-left, 2 top-right, 3 bottom-left, 4 bottom-right. Pick the single best movie poster that most closely matches the subject. Reply with one digit: 1, 2, 3, or 4.',
}
