import { MOODBOARD_PROMPT_SUFFIX, clampMoodboardSceneWords } from './moodboard-task-wire'
import {
  ApiframeGenerateAspectRatio,
  MIDJOURNEY_VERSION,
} from '@/shared/ai/utils/apiframe'
import { MidjourneyParamFlag } from '@/shared/data/server/midjourney-params'
import { appendStorytellerLookSref } from './storyteller-look-sref'

export enum LockedVisualConceptArt {
  Phrase = 'concept art',
}

export function lockedVisualBase(replacement: string): string {
  return MOODBOARD_PROMPT_SUFFIX.replace(LockedVisualConceptArt.Phrase, replacement)
}

export function buildLockedVisualPrompt(
  prefix: string,
  scene: string,
  baseReplacement: string,
): string | null {
  const clamped = clampMoodboardSceneWords(scene)
  if (!clamped) return null
  return `${prefix} ${clamped} ${lockedVisualBase(baseReplacement)}`
}

export function appendMidjourneyLockFlags(
  prompt: string,
  aspectRatio: string,
  extraUrls: readonly string[] = [],
): string {
  return appendStorytellerLookSref(
    `${prompt} ${MidjourneyParamFlag.Version} ${MIDJOURNEY_VERSION} ${MidjourneyParamFlag.AspectRatio} ${aspectRatio}`,
    extraUrls,
  )
}

export function buildPortraitMidjourneyLockFlags(
  prompt: string,
  extraUrls: readonly string[] = [],
): string {
  return appendMidjourneyLockFlags(prompt, ApiframeGenerateAspectRatio.Square, extraUrls)
}

export function buildPosterMidjourneyLockFlags(
  prompt: string,
  extraUrls: readonly string[] = [],
): string {
  return appendMidjourneyLockFlags(prompt, ApiframeGenerateAspectRatio.PortraitTwoThree, extraUrls)
}
