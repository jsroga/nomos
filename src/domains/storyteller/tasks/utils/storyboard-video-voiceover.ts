import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { arch, platform } from 'node:os'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import { beatShotText, type StoryboardVideoBeatText } from './storyboard-video-prompt'

/** Spoken words per second — leaves headroom under a 15s clip. */
export const STORYBOARD_VOICEOVER_WORDS_PER_SECOND = 2.4
export const STORYBOARD_VOICEOVER_TEMPERATURE = 0.3
export const STORYBOARD_VOICEOVER_BED_VOLUME = 0.22
export const STORYBOARD_VOICEOVER_FADE_SECONDS = 0.4
export const STORYBOARD_VOICEOVER_AAC_BITRATE = '192k'

export enum StoryboardTtsVoice {
  Eve = 'eve',
}

export enum StoryboardTtsFormat {
  Mp3 = 'mp3',
}

export const STORYBOARD_TTS_INSTRUCTIONS_HOOK_MAX = 160

export enum StoryboardTtsInstructions {
  Film = 'Speak as a cinematic film narrator. Low, measured, intimate. Grave when the story is dark. No cheer, no radio-announcer energy, no smile in the voice.',
  Storyboard = 'Speak as a storyboard animatic narrator. Dry, precise, close-mic. Grave when the story is dark. No cheer, no radio-announcer energy.',
  RegisterPrefix = 'Story register: ',
}

export enum StoryboardVoiceoverFile {
  Video = 'input.mp4',
  Voice = 'vo.mp3',
  Output = 'out.mp4',
}

export enum StoryboardVoiceoverBin {
  Ffmpeg = 'ffmpeg',
  Ffprobe = 'ffprobe',
}

export const STORYBOARD_FFMPEG_WALK_MAX = 8

export enum StoryboardFfmpegPackage {
  NodeModules = 'node_modules',
  Ffmpeg = 'ffmpeg-static',
  Ffprobe = 'ffprobe-static',
  FfprobeBin = 'bin',
}

export enum StoryboardProcessError {
  Enoent = 'ENOENT',
}

export enum StoryboardFfprobeCodec {
  Audio = 'audio',
}

export enum StoryboardVoiceoverTempPrefix {
  Dir = 'storyboard-vo-',
}

export enum StoryboardFfmpegArg {
  Input = '-i',
  FilterComplex = '-filter_complex',
  Map = '-map',
  VideoCodec = '-c:v',
  AudioCodec = '-c:a',
  AudioBitrate = '-b:a',
  VideoCopy = 'copy',
  AudioAac = 'aac',
  HideBanner = '-hide_banner',
  LogLevel = '-loglevel',
  Error = 'error',
  Overwrite = '-y',
  ProbeStream = '-select_streams',
  AudioStream0 = 'a:0',
  ShowEntries = '-show_entries',
  StreamCodecType = 'stream=codec_type',
  OutputFormat = '-of',
  Csv = 'csv=p=0',
  Quiet = '-v',
}

export enum StoryboardVoiceoverMap {
  Video = '0:v:0',
  MixedAudio = '[aout]',
  VoiceOnly = '[vo]',
}

export enum StoryboardVoiceoverSource {
  Mixed = 'mixed',
  Skipped = 'skipped',
}

export enum StoryboardVoiceoverSkip {
  NoScript = 'empty_script',
  NoTtsKey = 'missing_openrouter_api_key',
  TtsFailed = 'tts_failed',
  FfmpegMissing = 'ffmpeg_missing',
  MixFailed = 'mix_failed',
}

export enum StoryboardVoiceoverLog {
  TtsFailed = 'Storyboard TTS failed',
  MixFailed = 'Storyboard voice-over mix failed',
}

export enum StoryboardVoiceoverCopy {
  SystemFilm = 'You write spoken voice-over for a live-action film clip. Present tense. One continuous narrator. No quotes, no speaker labels, no stage directions, no shot numbers. Cover the episode arc, not every beat. Output only the words to speak.',
  SystemStoryboard = 'You write spoken voice-over for a storyboard animatic. Present tense. One continuous narrator. No quotes, no speaker labels, no stage directions, no shot numbers. Cover the episode arc, not every beat. Output only the words to speak.',
  WordBudgetPrefix = 'The clip is ',
  WordBudgetMid = ' seconds. Write about ',
  WordBudgetSuffix = ' words.',
}

export function storyboardVoiceoverWordBudget(duration: number): number {
  return Math.max(12, Math.round(duration * STORYBOARD_VOICEOVER_WORDS_PER_SECOND))
}

export function storyboardVoiceoverSystemPrompt(
  look: StoryboardVideoLook,
  duration: number,
): string {
  const words = storyboardVoiceoverWordBudget(duration)
  const lengthNote = `${StoryboardVoiceoverCopy.WordBudgetPrefix}${duration}${StoryboardVoiceoverCopy.WordBudgetMid}${words}${StoryboardVoiceoverCopy.WordBudgetSuffix}`
  const system =
    look === StoryboardVideoLook.Film
      ? StoryboardVoiceoverCopy.SystemFilm
      : StoryboardVoiceoverCopy.SystemStoryboard
  return `${system} ${lengthNote}`
}

export function storyboardTtsInstructions(
  look: StoryboardVideoLook,
  beats: StoryboardVideoBeatText[],
): string {
  const lock =
    look === StoryboardVideoLook.Film
      ? StoryboardTtsInstructions.Film
      : StoryboardTtsInstructions.Storyboard
  const first = beats[0]
  if (!first) return lock
  const hook = beatShotText(first, STORYBOARD_TTS_INSTRUCTIONS_HOOK_MAX)
  if (hook.length === 0) return lock
  return `${lock} ${StoryboardTtsInstructions.RegisterPrefix}${hook}`
}

export function capStoryboardVoiceoverScript(script: string, maxWords: number): string {
  const words = script.trim().split(/\s+/).filter(word => word.length > 0)
  if (words.length <= maxWords) return words.join(' ')
  return words.slice(0, maxWords).join(' ')
}

export function buildStoryboardVoiceoverFallback(
  beats: StoryboardVideoBeatText[],
  maxWords: number,
): string {
  const parts: string[] = []
  let count = 0
  for (const beat of beats) {
    const text = beatShotText(beat)
    if (text.length === 0) continue
    const words = text.split(/\s+/).filter(word => word.length > 0)
    if (words.length === 0) continue
    if (count >= maxWords) break
    const room = maxWords - count
    const chunk = words.slice(0, room)
    parts.push(chunk.join(' '))
    count += chunk.length
  }
  return parts.join('. ')
}

export function storyboardVoiceoverMixFilter(duration: number, hasBed: boolean): string {
  const fadeAt = Math.max(0, duration - STORYBOARD_VOICEOVER_FADE_SECONDS)
  const voice = `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeAt}:d=${STORYBOARD_VOICEOVER_FADE_SECONDS}[vo]`
  if (!hasBed) return voice
  return `[0:a]volume=${STORYBOARD_VOICEOVER_BED_VOLUME}[bed];${voice};[bed][vo]amix=inputs=2:duration=first:dropout_transition=2[aout]`
}

export function walkNodeModulesFile(startDir: string, parts: string[]): string | undefined {
  let dir = startDir
  for (let step = 0; step < STORYBOARD_FFMPEG_WALK_MAX; step++) {
    const candidate = join(dir, StoryboardFfmpegPackage.NodeModules, ...parts)
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

export function packagedFfmpegBinary(startDir: string): string | undefined {
  return walkNodeModulesFile(startDir, [StoryboardFfmpegPackage.Ffmpeg, StoryboardVoiceoverBin.Ffmpeg])
}

export function packagedFfprobeBinary(startDir: string): string | undefined {
  return walkNodeModulesFile(startDir, [
    StoryboardFfmpegPackage.Ffprobe,
    StoryboardFfmpegPackage.FfprobeBin,
    platform(),
    arch(),
    StoryboardVoiceoverBin.Ffprobe,
  ])
}

export function resolveStoryboardBin(
  envValue: string | undefined,
  packagedPath: string | undefined,
  fallback: string,
  exists: (binPath: string) => boolean = existsSync,
): string {
  if (typeof envValue === 'string' && envValue.length > 0 && exists(envValue)) return envValue
  if (typeof packagedPath === 'string' && packagedPath.length > 0 && exists(packagedPath)) {
    return packagedPath
  }
  return fallback
}
