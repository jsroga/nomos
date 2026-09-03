import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { logger } from '@trigger.dev/sdk'
import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { jobContextScope } from '@/shared/auth/project-scope'
import { isVisualSubjectConfigured } from '@/domains/storyteller/services/visual-subject-llm'
import { ContentType, EnvVarName, HttpAuthScheme, HttpMethod } from '@/shared/data/constants/protocol'
import { TEXT_GEN_FAST_MODEL, TEXT_TO_SPEECH_MODEL, openRouterClientConfig } from '@/shared/agent-kernel/models'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { buildStoryboardCorePromptUser, type StoryboardVideoBeatText } from './constants/storyboard-video-prompt'
import {
  StoryboardFfmpegArg,
  StoryboardFfprobeCodec,
  StoryboardProcessError,
  StoryboardTtsFormat,
  StoryboardTtsVoice,
  StoryboardVoiceoverBin,
  StoryboardVoiceoverFile,
  StoryboardVoiceoverLog,
  StoryboardVoiceoverMap,
  StoryboardVoiceoverSkip,
  StoryboardVoiceoverSource,
  StoryboardVoiceoverTempPrefix,
  STORYBOARD_VOICEOVER_AAC_BITRATE,
  STORYBOARD_VOICEOVER_TEMPERATURE,
  buildStoryboardVoiceoverFallback,
  capStoryboardVoiceoverScript,
  packagedFfmpegBinary,
  packagedFfprobeBinary,
  resolveStoryboardBin,
  storyboardTtsInstructions,
  storyboardVoiceoverMixFilter,
  storyboardVoiceoverSystemPrompt,
  storyboardVoiceoverWordBudget,
} from './constants/storyboard-video-voiceover'

export interface StoryboardVoiceoverResult {
  bytes: Buffer
  source: StoryboardVoiceoverSource
  script?: string
  skip?: StoryboardVoiceoverSkip
}

function ffmpegBin(): string {
  return resolveStoryboardBin(
    process.env[EnvVarName.FfmpegPath],
    packagedFfmpegBinary(process.cwd()),
    StoryboardVoiceoverBin.Ffmpeg,
  )
}

function ffprobeBin(): string {
  return resolveStoryboardBin(
    process.env[EnvVarName.FfprobePath],
    packagedFfprobeBinary(process.cwd()),
    StoryboardVoiceoverBin.Ffprobe,
  )
}

async function runProcess(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []
    child.stdout?.on('data', chunk => {
      chunks.push(Buffer.from(chunk))
    })
    child.stderr?.on('data', chunk => {
      errChunks.push(Buffer.from(chunk))
    })
    child.on('error', reject)
    child.on('close', code => {
      const stdout = Buffer.concat(chunks).toString()
      const stderr = Buffer.concat(errChunks).toString()
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(stderr || stdout || String(code)))
    })
  })
}

export async function generateStoryboardVoiceoverScript(
  beats: StoryboardVideoBeatText[],
  duration: number,
  look: StoryboardVideoLook,
  projectId?: string,
): Promise<string> {
  const maxWords = storyboardVoiceoverWordBudget(duration)
  const fallback = buildStoryboardVoiceoverFallback(beats, maxWords)
  if (!projectId) return fallback
  try {
    const { text } = await complete({
      scope: jobContextScope(projectId),
      feature: LlmFeature.StorytellerVisualSubject,
      model: TEXT_GEN_FAST_MODEL,
      system: storyboardVoiceoverSystemPrompt(look, duration),
      prompt: buildStoryboardCorePromptUser(beats),
      temperature: STORYBOARD_VOICEOVER_TEMPERATURE,
    })
    const capped = capStoryboardVoiceoverScript(text.trim(), maxWords)
    return capped.length > 0 ? capped : fallback
  } catch {
    return fallback
  }
}

async function synthesizeStoryboardVoiceover(
  script: string,
  instructions: string,
): Promise<Buffer | null> {
  const { apiKey, baseURL } = openRouterClientConfig()
  if (!apiKey) return null
  const response = await fetch(`${baseURL}/audio/speech`, {
    method: HttpMethod.Post,
    headers: {
      Authorization: `${HttpAuthScheme.Bearer}${apiKey}`,
      'Content-Type': ContentType.Json,
    },
    body: JSON.stringify({
      model: TEXT_TO_SPEECH_MODEL,
      voice: StoryboardTtsVoice.Eve,
      input: script,
      response_format: StoryboardTtsFormat.Mp3,
      instructions,
    }),
  })
  if (!response.ok) return null
  return Buffer.from(await response.arrayBuffer())
}

async function videoHasAudioStream(videoPath: string): Promise<boolean> {
  try {
    const result = await runProcess(ffprobeBin(), [
      StoryboardFfmpegArg.Quiet,
      StoryboardFfmpegArg.Error,
      StoryboardFfmpegArg.ProbeStream,
      StoryboardFfmpegArg.AudioStream0,
      StoryboardFfmpegArg.ShowEntries,
      StoryboardFfmpegArg.StreamCodecType,
      StoryboardFfmpegArg.OutputFormat,
      StoryboardFfmpegArg.Csv,
      videoPath,
    ])
        return result.stdout.toLowerCase().includes(StoryboardFfprobeCodec.Audio)
  } catch {
    return false
  }
}

async function mixVoiceoverTrack(
  videoPath: string,
  voicePath: string,
  outputPath: string,
  duration: number,
  hasBed: boolean,
): Promise<void> {
  const audioMap = hasBed ? StoryboardVoiceoverMap.MixedAudio : StoryboardVoiceoverMap.VoiceOnly
  await runProcess(ffmpegBin(), [
    StoryboardFfmpegArg.HideBanner,
    StoryboardFfmpegArg.LogLevel,
    StoryboardFfmpegArg.Error,
    StoryboardFfmpegArg.Overwrite,
    StoryboardFfmpegArg.Input,
    videoPath,
    StoryboardFfmpegArg.Input,
    voicePath,
    StoryboardFfmpegArg.FilterComplex,
    storyboardVoiceoverMixFilter(duration, hasBed),
    StoryboardFfmpegArg.Map,
    StoryboardVoiceoverMap.Video,
    StoryboardFfmpegArg.Map,
    audioMap,
    StoryboardFfmpegArg.VideoCodec,
    StoryboardFfmpegArg.VideoCopy,
    StoryboardFfmpegArg.AudioCodec,
    StoryboardFfmpegArg.AudioAac,
    StoryboardFfmpegArg.AudioBitrate,
    STORYBOARD_VOICEOVER_AAC_BITRATE,
    outputPath,
  ])
}

function isMissingBinary(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if (!('code' in error)) return false
  return error.code === StoryboardProcessError.Enoent
}

function skipped(
  videoBytes: Buffer,
  skip: StoryboardVoiceoverSkip,
  script?: string,
): StoryboardVoiceoverResult {
  return { bytes: videoBytes, source: StoryboardVoiceoverSource.Skipped, script, skip }
}

export async function mixStoryboardVoiceover(input: {
  videoBytes: Buffer
  beats: StoryboardVideoBeatText[]
  duration: number
  look: StoryboardVideoLook
  projectId: string
}): Promise<StoryboardVoiceoverResult> {
  const script = (await generateStoryboardVoiceoverScript(
    input.beats,
    input.duration,
    input.look,
    input.projectId,
  )).trim()
  if (script.length === 0) {
    return skipped(input.videoBytes, StoryboardVoiceoverSkip.NoScript)
  }

  if (!isVisualSubjectConfigured()) {
    return skipped(input.videoBytes, StoryboardVoiceoverSkip.NoTtsKey, script)
  }

  let voiceBytes: Buffer
  try {
    const synthesized = await synthesizeStoryboardVoiceover(
      script,
      storyboardTtsInstructions(input.look, input.beats),
    )
    if (!synthesized || synthesized.length === 0) {
      return skipped(input.videoBytes, StoryboardVoiceoverSkip.TtsFailed, script)
    }
    voiceBytes = synthesized
  } catch (error: unknown) {
    logger.warn(StoryboardVoiceoverLog.TtsFailed, { error: getErrorMessage(error) })
    return skipped(input.videoBytes, StoryboardVoiceoverSkip.TtsFailed, script)
  }

  const workDir = await mkdtemp(join(tmpdir(), StoryboardVoiceoverTempPrefix.Dir))
  const videoPath = join(workDir, StoryboardVoiceoverFile.Video)
  const voicePath = join(workDir, StoryboardVoiceoverFile.Voice)
  const outputPath = join(workDir, StoryboardVoiceoverFile.Output)
  try {
    await writeFile(videoPath, input.videoBytes)
    await writeFile(voicePath, voiceBytes)
    const hasBed = await videoHasAudioStream(videoPath)
    await mixVoiceoverTrack(videoPath, voicePath, outputPath, input.duration, hasBed)
    const mixed = await readFile(outputPath)
    return { bytes: mixed, source: StoryboardVoiceoverSource.Mixed, script }
  } catch (error: unknown) {
    logger.warn(StoryboardVoiceoverLog.MixFailed, {
      error: getErrorMessage(error),
      ffmpeg: ffmpegBin(),
      ffprobe: ffprobeBin(),
    })
    return skipped(
      input.videoBytes,
      isMissingBinary(error) ? StoryboardVoiceoverSkip.FfmpegMissing : StoryboardVoiceoverSkip.MixFailed,
      script,
    )
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
