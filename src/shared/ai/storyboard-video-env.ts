import {
  ApiframeVideoModel,
  isApiframeVideoModel,
} from '@/shared/ai/constants/apiframe'
import { ImageEnvVar } from '@/shared/ai/constants/image-env'

export enum StoryboardVideoRequestField {
  Model = 'model',
  Look = 'look',
}

export enum StoryboardVideoLook {
  Film = 'film',
  Storyboard = 'storyboard',
}

export enum StoryboardVideoPreset {
  KlingFilm = 'kling-film',
  KlingStoryboard = 'kling-storyboard',
  SeedanceFilm = 'seedance-film',
  SeedanceStoryboard = 'seedance-storyboard',
}

export const STORYBOARD_VIDEO_PRESETS = [
  StoryboardVideoPreset.KlingFilm,
  StoryboardVideoPreset.KlingStoryboard,
  StoryboardVideoPreset.SeedanceFilm,
  StoryboardVideoPreset.SeedanceStoryboard,
] as const

/** CorkBoard storyboard video length in seconds. */
export const STORYBOARD_VIDEO_DURATION = 15

function readEnv(name: ImageEnvVar, source?: Record<string, string | undefined>): string | undefined {
  const raw = source ? source[name] : process.env[name]
  const trimmed = raw?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export function isStoryboardVideoLook(value: unknown): value is StoryboardVideoLook {
  return value === StoryboardVideoLook.Film || value === StoryboardVideoLook.Storyboard
}

export function isStoryboardVideoPreset(value: unknown): value is StoryboardVideoPreset {
  return (
    value === StoryboardVideoPreset.KlingFilm ||
    value === StoryboardVideoPreset.KlingStoryboard ||
    value === StoryboardVideoPreset.SeedanceFilm ||
    value === StoryboardVideoPreset.SeedanceStoryboard
  )
}

export function resolveStoryboardVideoLook(selected?: unknown): StoryboardVideoLook {
  return isStoryboardVideoLook(selected) ? selected : StoryboardVideoLook.Storyboard
}

export function storyboardVideoFromPreset(preset: StoryboardVideoPreset): {
  model: ApiframeVideoModel
  look: StoryboardVideoLook
} {
  if (preset === StoryboardVideoPreset.KlingFilm) {
    return { model: ApiframeVideoModel.Kling30, look: StoryboardVideoLook.Film }
  }
  if (preset === StoryboardVideoPreset.SeedanceFilm) {
    return { model: ApiframeVideoModel.Seedance25, look: StoryboardVideoLook.Film }
  }
  if (preset === StoryboardVideoPreset.SeedanceStoryboard) {
    return { model: ApiframeVideoModel.Seedance25, look: StoryboardVideoLook.Storyboard }
  }
  return { model: ApiframeVideoModel.Kling30, look: StoryboardVideoLook.Storyboard }
}

export function resolveStoryboardVideoModel(
  source?: Record<string, string | undefined>,
  selected?: unknown,
): ApiframeVideoModel {
  if (isApiframeVideoModel(selected)) return selected
  const raw = readEnv(ImageEnvVar.StoryboardVideoModel, source)?.toLowerCase()
  if (isApiframeVideoModel(raw)) return raw
  return ApiframeVideoModel.Kling30
}

export function resolveStoryboardVideoDuration(
  _source?: Record<string, string | undefined>,
  _model?: ApiframeVideoModel,
): number {
  return STORYBOARD_VIDEO_DURATION
}
