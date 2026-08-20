import { logger } from '@trigger.dev/sdk'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson } from '@/shared/data/json-guards'
import { ContentType } from '@/shared/data/constants/protocol'
import { ApiframeVideoModel } from '@/shared/ai/constants/apiframe'
import type { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import type { KlingMultiPromptShot } from '@/shared/ai/apiframe-video'
import { persistGeneratedMedia } from './persist-generated-image'
import { beatHasImageUrl } from './constants/storyboard-video-sheet'
import {
  buildStoryboardMultiPrompt,
  storyboardLookNegative,
} from './constants/storyboard-video-prompt'

export enum CombinedStoryboardStage {
  Summarizing = 'summarizing_prompt',
  Composing = 'composing_sheet',
  Uploading = 'uploading_sheet',
  Generating = 'generating_video',
  Voiceover = 'mixing_voiceover',
  Saving = 'saving_video',
  Updating = 'updating_database',
}

export enum CombinedStoryboardMetadataKey {
  EpisodeId = 'episode_id',
  ProjectId = 'project_id',
  Stage = 'stage',
  Prompt = 'prompt',
  CorePromptSource = 'core_prompt_source',
  Model = 'model',
  Look = 'look',
  Duration = 'duration',
  StartImage = 'start_image',
  JobId = 'apiframe_job_id',
  BeatCount = 'beat_count',
  VoiceoverSource = 'voiceover_source',
  VoiceoverSkip = 'voiceover_skip',
}

export enum CombinedStoryboardLog {
  Starting = 'Starting storyboard video generation',
  CorePrompt = 'Storyboard core prompt',
  Composing = 'Composing contact sheet from beat stills',
  SheetReady = 'Contact sheet composed',
  SheetUploaded = 'Contact sheet uploaded',
  Prompt = 'Storyboard video prompt',
  JobAccepted = 'Apiframe video job accepted',
  Voiceover = 'Storyboard voice-over mix',
  DbUpdated = 'Episode story_plan updated with storyboardUrl',
  Completed = 'Storyboard video generation completed',
  Failed = 'Storyboard video generation failed',
}

export const COMBINED_STORYBOARD_ERROR = {
  FetchEpisode: 'Failed to fetch episode for storyboard update',
  UpdatePlan: 'Failed to update episode story_plan with storyboardUrl',
  DownloadVideo: 'Failed to download storyboard video',
  MissingApiKey: 'Apiframe API key not provided',
  DownloadBeatImage: 'Failed to download beat image',
  MissingBeatFile: 'Beat image file not found',
  MissingBeatUrl: 'Beat image URL missing after filter',
} as const

const STORY_PLAN_COL = 'story_plan'
const STORY_PLAN_JSON_KEY = 'storyPlan'
const EPISODES_TABLE = 'episodes'

export interface CombinedStoryboardBeat {
  logline: string
  visualHook?: string
  imagePrompt?: string
  imageUrl?: string
}

export function beatsHaveImageUrl(beats: CombinedStoryboardBeat[]): boolean {
  return beats.some(beat => beatHasImageUrl(beat.imageUrl))
}

export function beatsWithImageUrl(
  beats: CombinedStoryboardBeat[],
): CombinedStoryboardBeat[] {
  return beats.filter(beat => beatHasImageUrl(beat.imageUrl))
}

export function storyboardKlingDirectorFields(
  model: ApiframeVideoModel,
  beats: CombinedStoryboardBeat[],
  duration: number,
  look: StoryboardVideoLook,
): { negativePrompt?: string; multiPrompt?: KlingMultiPromptShot[] } {
  if (model === ApiframeVideoModel.Seedance25) return {}
  return {
    negativePrompt: storyboardLookNegative(look),
    multiPrompt: buildStoryboardMultiPrompt(beats, duration, look),
  }
}

export async function persistCombinedStoryboardMedia(
  projectId: string,
  filename: string,
  bytes: Buffer,
  contentType: ContentType,
): Promise<string> {
  const url = await persistGeneratedMedia({ projectId, filename, bytes, contentType })
  logger.info('Combined storyboard media persisted', { url, contentType })
  return url
}

export async function persistEpisodeStoryboardUrl(
  episodeId: string,
  imageUrl: string,
  prompt: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient()

  const { data: episodeData, error: fetchError } = await supabase
    .from(EPISODES_TABLE)
    .select(STORY_PLAN_COL)
    .eq('id', episodeId)
    .single()

  if (fetchError || !episodeData) {
    throw new Error(
      `${COMBINED_STORYBOARD_ERROR.FetchEpisode}: ${fetchError?.message ?? getErrorMessage(fetchError)}`,
    )
  }

  const row = recordFromJson(episodeData)
  const currentPlan = recordFromJson(row[STORY_PLAN_COL] ?? row[STORY_PLAN_JSON_KEY])
  const { error: updateError } = await supabase
    .from(EPISODES_TABLE)
    .update({
      [STORY_PLAN_COL]: {
        ...currentPlan,
        storyboardUrl: imageUrl,
        storyboardPrompt: prompt,
      },
    })
    .eq('id', episodeId)

  if (updateError) {
    throw new Error(`${COMBINED_STORYBOARD_ERROR.UpdatePlan}: ${updateError.message}`)
  }

  logger.info(CombinedStoryboardLog.DbUpdated, { episodeId, storyboardUrl: imageUrl })
}
