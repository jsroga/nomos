import { StorytellerAnswerSeparator } from '@/domains/storyteller/core/storyteller-page-wire'

export enum StoryboardBeatTable {
  Beats = 'beats',
  Characters = 'characters',
}

export enum StoryboardBeatColumn {
  Id = 'id',
  ProjectId = 'project_id',
  Logline = 'logline',
  Content = 'content',
  VisualHook = 'visual_hook',
  ImagePrompt = 'image_prompt',
  CharactersInvolved = 'characters_involved',
  Name = 'name',
  PortraitUrl = 'portrait_url',
  ImageUrl = 'image_url',
}

export enum StoryboardGenerationStage {
  ExtractingCast = 'extracting_cast',
  GeneratingImage = 'generating_image',
  SavingImage = 'saving_image',
  Completed = 'completed',
}

export enum StoryboardGenerationProgress {
  Start = 0,
  CastResolved = 20,
  ImageReady = 50,
  Done = 100,
}

export enum StoryboardGenerationMetadataKey {
  BeatId = 'beat_id',
  ProjectId = 'project_id',
  Progress = 'progress',
  Stage = 'stage',
  CastNames = 'cast_names',
  RefCount = 'ref_count',
}

export enum StoryboardBeatLog {
  Starting = 'Starting storyboard generation for beat',
  CastLoadFailed = 'Failed to load beat cast for storyboard refs',
  CastResolved = 'Beat cast resolved for storyboard',
  Generating = 'Generating storyboard via Apiframe Nano Banana',
  UpdateFailed = 'Failed to update beat image_url',
}

export enum StoryboardPortraitRefFilename {
  Prefix = 'beat-ref-',
}

export const STORYBOARD_BEAT_SELECT = [
  StoryboardBeatColumn.Logline,
  StoryboardBeatColumn.Content,
  StoryboardBeatColumn.VisualHook,
  StoryboardBeatColumn.ImagePrompt,
  StoryboardBeatColumn.CharactersInvolved,
].join(StorytellerAnswerSeparator.CommaSpace)

export const STORYBOARD_CAST_SELECT = [
  StoryboardBeatColumn.Id,
  StoryboardBeatColumn.Name,
  StoryboardBeatColumn.PortraitUrl,
].join(StorytellerAnswerSeparator.CommaSpace)
