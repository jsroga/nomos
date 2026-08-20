import {
  APIFRAME_VIDEO_PROMPT_MAX_CHARS,
  ApiframeVideoModel,
  KLING_MULTI_PROMPT_MAX_SHOTS,
  KLING_MULTI_PROMPT_SHOT_DURATION_MAX,
  KLING_MULTI_PROMPT_SHOT_DURATION_MIN,
  KLING_MULTI_PROMPT_SHOT_PROMPT_MAX_CHARS,
} from '@/shared/ai/constants/apiframe'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import type { KlingMultiPromptShot } from '@/shared/ai/apiframe-video'

export const STORYBOARD_VIDEO_PROMPT = {
  IntroFilm:
    'Cinematic 16:9 live-action sequence. The start image is a numbered shot list only — do not play or animate that grid as a scene. Cut immediately to full-frame Shot 1, then Shot 2, Shot 3, in reading order. Never skip Shot 1.',
  IntroStoryboard:
    '16:9 rough black-and-white storyboard sequence. The start image is a numbered shot list only — do not play or animate that grid as a scene. Cut immediately to full-frame Shot 1, then Shot 2, Shot 3, in reading order. Never skip Shot 1.',
  BeatPrefix: 'Shot ',
  BeatSep: ': ',
} as const

export enum StoryboardLookLock {
  Film = 'LOOK LOCK: live-action cinematic COLOR film photography. The start image is only a numbered shot list — not a scene. Cut immediately to full-frame Shot 1, then copy framing and action as real cameras, lighting, costumes, and faces. Forbidden: lingering on the grid, skipping Shot 1, pencil, marker, paper, black-and-white sketch, comic panels remaining as drawings.',
  Storyboard = 'LOOK LOCK: stay a rough BLACK-AND-WHITE STORYBOARD SKETCH. Pencil/marker lines on paper, high contrast, no color. Cut to each numbered panel full-frame in order. Forbidden: animating the contact-sheet grid as a scene, skipping Shot 1, photoreal skin, live-action, color grade, CGI, photographic film.',
}

export enum StoryboardShotLookTag {
  Film = 'live-action color film',
  Storyboard = 'B&W sketch storyboard',
}

export enum StoryboardShotCut {
  First = 'Full-frame Shot 1 now — the first numbered panel, not the contact-sheet grid, not Shot 2.',
}

export enum StoryboardLookNegative {
  Shared = 'comic grid, contact sheet, numbered panels as a page, watermark, title card, split screen, collage',
  Film = 'storyboard sketch, pencil drawing, marker lines, black and white comic, paper texture, unfinished sketch',
  Storyboard = 'photoreal, live action, color photography, cinematic color grade, realistic skin, 3d render, photographic live-action',
}

export enum StoryboardSeedanceAvoid {
  Prefix = 'Avoid: ',
}

export const STORYBOARD_VIDEO_BEAT_MAX_CHARS = 80
export const STORYBOARD_CORE_BEAT_MAX_CHARS = 240
export const STORYBOARD_CORE_PROMPT_TEMPERATURE = 0.4

export enum StoryboardCorePromptCopy {
  SystemFilm = 'You write one image-to-video prompt for LIVE-ACTION COLOR FILM. The start frame is a numbered 16:9 contact sheet used only as a shot list — not a scene. Direct the model to cut immediately to full-frame Shot 1, then play the listed beats in order as photographed scenes. Never skip Shot 1. Output only the prompt. Stay under 4000 characters. No titles, no watermarks, no mention of AI.',
  SystemStoryboard = 'You write one image-to-video prompt for a BLACK-AND-WHITE STORYBOARD SKETCH. The start frame is a numbered 16:9 contact sheet used only as a shot list — not a scene. Direct the model to cut immediately to full-frame Shot 1, then play the listed beats in order as sketched panels. Never skip Shot 1. No photorealism, no color film. Output only the prompt. Stay under 4000 characters. No titles, no watermarks, no mention of AI.',
}

export enum StoryboardCorePromptSource {
  Llm = 'llm',
  Fallback = 'fallback',
}

export interface StoryboardVideoBeatText {
  logline: string
  visualHook?: string
  imagePrompt?: string
  imageUrl?: string
}

function clipBeatText(raw: string, maxChars: number): string {
  const trimmed = raw.trim()
  if (trimmed.length <= maxChars) return trimmed
  return trimmed.slice(0, maxChars)
}

export function beatShotText(
  beat: StoryboardVideoBeatText,
  maxChars: number = STORYBOARD_VIDEO_BEAT_MAX_CHARS,
): string {
  return clipBeatText(beat.visualHook || beat.logline || beat.imagePrompt || '', maxChars)
}

function shotLine(beat: StoryboardVideoBeatText, index: number, maxChars: number): string {
  const text = beatShotText(beat, maxChars)
  return `${STORYBOARD_VIDEO_PROMPT.BeatPrefix}${index + 1}${STORYBOARD_VIDEO_PROMPT.BeatSep}${text}`
}

export function storyboardLookLock(look: StoryboardVideoLook): StoryboardLookLock {
  return look === StoryboardVideoLook.Film ? StoryboardLookLock.Film : StoryboardLookLock.Storyboard
}

export function storyboardShotLookTag(look: StoryboardVideoLook): StoryboardShotLookTag {
  return look === StoryboardVideoLook.Film
    ? StoryboardShotLookTag.Film
    : StoryboardShotLookTag.Storyboard
}

export function storyboardLookNegative(look: StoryboardVideoLook): string {
  const lookNeg =
    look === StoryboardVideoLook.Film ? StoryboardLookNegative.Film : StoryboardLookNegative.Storyboard
  return `${StoryboardLookNegative.Shared}, ${lookNeg}`
}

export function storyboardCoreSystemPrompt(look: StoryboardVideoLook): StoryboardCorePromptCopy {
  return look === StoryboardVideoLook.Film
    ? StoryboardCorePromptCopy.SystemFilm
    : StoryboardCorePromptCopy.SystemStoryboard
}

export function applyStoryboardLookPrompt(
  prompt: string,
  look: StoryboardVideoLook,
  model: ApiframeVideoModel = ApiframeVideoModel.Kling30,
): string {
  const locked = `${storyboardLookLock(look)}\n${prompt.trim()}`
  if (model !== ApiframeVideoModel.Seedance25) {
    return capStoryboardCorePrompt(locked)
  }
  return capStoryboardCorePrompt(
    `${locked}\n${StoryboardSeedanceAvoid.Prefix}${storyboardLookNegative(look)}.`,
  )
}

function lookIntro(look: StoryboardVideoLook): string {
  return look === StoryboardVideoLook.Film
    ? STORYBOARD_VIDEO_PROMPT.IntroFilm
    : STORYBOARD_VIDEO_PROMPT.IntroStoryboard
}

export function buildStoryboardVideoPrompt(
  beats: StoryboardVideoBeatText[],
  look: StoryboardVideoLook = StoryboardVideoLook.Storyboard,
  model: ApiframeVideoModel = ApiframeVideoModel.Kling30,
): string {
  const shots = beats
    .map((beat, index) => shotLine(beat, index, STORYBOARD_VIDEO_BEAT_MAX_CHARS))
    .filter(line => line.length > STORYBOARD_VIDEO_PROMPT.BeatPrefix.length + 3)

  const body = [lookIntro(look), '', ...shots].join('\n')
  return applyStoryboardLookPrompt(body, look, model)
}

export function buildStoryboardCorePromptUser(beats: StoryboardVideoBeatText[]): string {
  return beats
    .map((beat, index) => shotLine(beat, index, STORYBOARD_CORE_BEAT_MAX_CHARS))
    .join('\n')
}

export function capStoryboardCorePrompt(prompt: string): string {
  const trimmed = prompt.trim()
  if (trimmed.length <= APIFRAME_VIDEO_PROMPT_MAX_CHARS) return trimmed
  return trimmed.slice(0, APIFRAME_VIDEO_PROMPT_MAX_CHARS)
}

export function klingMultiPromptShotCount(beatCount: number, totalDuration: number): number {
  if (beatCount <= 0) return 0
  const minByDuration = Math.ceil(totalDuration / KLING_MULTI_PROMPT_SHOT_DURATION_MAX)
  return Math.min(KLING_MULTI_PROMPT_MAX_SHOTS, Math.max(beatCount, minByDuration))
}

export function klingShotDurations(shotCount: number, totalDuration: number): number[] {
  if (shotCount <= 0) return []
  const count = Math.min(shotCount, KLING_MULTI_PROMPT_MAX_SHOTS)
  const minTotal = count * KLING_MULTI_PROMPT_SHOT_DURATION_MIN
  const maxTotal = count * KLING_MULTI_PROMPT_SHOT_DURATION_MAX
  const total = Math.min(maxTotal, Math.max(minTotal, Math.round(totalDuration)))
  const base = Math.floor(total / count)
  const remainder = total % count
  return Array.from({ length: count }, (_, index) => {
    const duration = base + (index < remainder ? 1 : 0)
    return Math.min(
      KLING_MULTI_PROMPT_SHOT_DURATION_MAX,
      Math.max(KLING_MULTI_PROMPT_SHOT_DURATION_MIN, duration),
    )
  })
}

function packSequentialGroups<T>(items: T[], groupCount: number): T[][] {
  const count = Math.max(1, Math.min(groupCount, items.length))
  const baseSize = Math.floor(items.length / count)
  const extra = items.length % count
  const groups: T[][] = []
  let offset = 0
  for (let index = 0; index < count; index++) {
    const size = baseSize + (index < extra ? 1 : 0)
    groups.push(items.slice(offset, offset + size))
    offset += size
  }
  return groups
}

function allocateShotGroups(
  beats: StoryboardVideoBeatText[],
  shotCount: number,
): { group: StoryboardVideoBeatText[]; startIndex: number }[] {
  if (beats.length >= shotCount) {
    const groups = packSequentialGroups(beats, shotCount)
    let offset = 0
    return groups.map(group => {
      const startIndex = offset
      offset += group.length
      return { group, startIndex }
    })
  }
  return Array.from({ length: shotCount }, (_, index) => {
    const beatIndex = Math.min(index, beats.length - 1)
    const beat = beats[beatIndex]
    return { group: beat ? [beat] : [], startIndex: beatIndex }
  })
}

function shotDirectorPrompt(
  beat: StoryboardVideoBeatText,
  index: number,
  look: StoryboardVideoLook,
): string {
  const tag = storyboardShotLookTag(look)
  const line = shotLine(beat, index, STORYBOARD_VIDEO_BEAT_MAX_CHARS)
  if (index === 0) return `${tag}. ${StoryboardShotCut.First} ${line}`
  return `${tag}. ${line}`
}

function groupedShotDirectorPrompt(
  group: StoryboardVideoBeatText[],
  startIndex: number,
  look: StoryboardVideoLook,
): string {
  const joined = group
    .map((beat, offset) => shotDirectorPrompt(beat, startIndex + offset, look))
    .join(' ')
  return clipBeatText(joined, KLING_MULTI_PROMPT_SHOT_PROMPT_MAX_CHARS)
}

export function buildStoryboardMultiPrompt(
  beats: StoryboardVideoBeatText[],
  duration: number,
  look: StoryboardVideoLook = StoryboardVideoLook.Storyboard,
): KlingMultiPromptShot[] {
  const shotCount = klingMultiPromptShotCount(beats.length, duration)
  if (shotCount === 0) return []
  const allocations = allocateShotGroups(beats, shotCount)
  const durations = klingShotDurations(allocations.length, duration)
  return allocations.map((allocation, index) => ({
    prompt: groupedShotDirectorPrompt(allocation.group, allocation.startIndex, look),
    duration: durations[index] ?? KLING_MULTI_PROMPT_SHOT_DURATION_MIN,
  }))
}

