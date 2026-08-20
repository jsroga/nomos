export const PORTRAIT_LLM_TASK = 'portrait-generation'

export enum GeneratePortraitStage {
  Initializing = 'initializing',
  Generating = 'generating',
  Selecting = 'selecting_variant',
  Upsampling = 'upsampling',
  Downloading = 'downloading',
  Saving = 'saving',
  UpdatingDb = 'updating_db',
  Completed = 'completed',
}

export enum GeneratePortraitProgress {
  Init = 0,
  Generating = 30,
  Selecting = 50,
  Upsampling = 65,
  Downloading = 80,
  Saving = 88,
  UpdatingDb = 94,
  Completed = 100,
}

export enum GeneratePortraitMetadataKey {
  Progress = 'progress',
  Stage = 'stage',
  ProjectId = 'projectId',
  Prompt = 'prompt',
  CharacterId = 'characterId',
  DiffusionJobId = 'diffusion_job_id',
  VariantIndex = 'variant_index',
}

export enum GeneratePortraitLog {
  Starting = 'Starting portrait generation',
  MidjourneyPrompt = 'Midjourney prompt',
  MidjourneyRaw = 'Raw Midjourney output',
  VariantPicked = 'Portrait variant picked',
  UpsampleRaw = 'Raw Midjourney upsample output',
  Saved = 'Portrait saved',
  DbUpdated = 'Character portrait_url updated',
  DbSkipped = 'Skipping character DB update; characterId is not a UUID',
  DbFailed = 'Failed to update character in DB',
  NoImage = 'No image URL in Apiframe output',
}

export enum GeneratePortraitError {
  ProjectIdRequired = 'projectId is required',
  ApiframeKeyRequired = 'Apiframe API key is required',
  NoImageUrl = 'No image URL found in Apiframe output',
  DownloadFailedPrefix = 'Failed to download image:',
  CharacterNotFound = 'Character not found for portrait persist',
  DbUpdateFailed = 'Failed to persist character portrait_url',
}

export enum GeneratePortraitFilename {
  Prefix = 'portrait',
  Draft = 'draft',
}

export enum GeneratePortraitDir {
  Portraits = 'portraits',
}

export enum GeneratePortraitTable {
  Characters = 'characters',
}

export enum GeneratePortraitColumn {
  Id = 'id',
  PortraitUrl = 'portrait_url',
  UpdatedAt = 'updated_at',
}

const CHARACTER_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isPortraitCharacterUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && CHARACTER_UUID_PATTERN.test(value)
}

export { buildPortraitMidjourneyLockFlags as buildPortraitMidjourneyPrompt } from './locked-visual-prompt'
