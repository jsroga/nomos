import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

export const MoodboardProvider = {
  Midjourney: ImageGenProvider.Midjourney,
} as const

export type MoodboardProvider = (typeof MoodboardProvider)[keyof typeof MoodboardProvider]

export enum BibleOverviewToast {
  UnknownProvider = 'provider',
  MissingApiKeyPrefix = 'Missing API key for ',
  MissingApiKeySuffix = '. Please configure in Settings.',
  RegenerationError = 'Error starting regeneration',
  ImageRemoved = 'Image removed',
  RemoveImageError = 'Error removing image',
  NewImageGenerating = 'Generating new moodboard image...',
  GenerationError = 'Error starting generation',
  GenerationFailed = 'Moodboard generation failed',
  WorldDescriptionRequired = 'Please add a world description first.',
  InitialMoodboardGenerating = 'Generating moodboard images...',
}

export enum BibleOverviewConfirm {
  DeleteImageTitle = 'Delete Image',
  DeleteImageDescription =
    'Are you sure you want to remove this moodboard image? This cannot be undone.',
  DeleteLabel = 'Delete',
  DestructiveVariant = 'destructive',
}

export enum BibleOverviewMoodboardCopy {
  ProcessingVisuals = 'Processing visuals...',
  Generating = 'Generating...',
  NoImage = 'No Image',
  NoMoodVisuals = 'No mood visuals generated yet.',
  GenerateWithMidjourney = 'Generate Moodboard with Midjourney',
  RefreshMoodboard = 'Generate or refresh moodboard',
}

export enum BibleOverviewSectionTitle {
  Overview = 'Overview',
  Moodboard = 'Moodboard',
}

export const WORLD_DESCRIPTION_REGEN_PROMPT =
  'Generate a completely BRAND NEW, rich world description including setting, atmosphere, and key details. IMPORTANT: Take a completely new creative direction and do NOT repeat previous content.'
