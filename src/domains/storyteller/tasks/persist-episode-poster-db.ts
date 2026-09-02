import { logger } from '@trigger.dev/sdk'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import {
  GeneratePosterColumn,
  GeneratePosterError,
  GeneratePosterLog,
  GeneratePosterPlanField,
  GeneratePosterTable,
} from './constants/generate-poster-wire'

export enum PersistEpisodePosterRetry {
  Attempts = 3,
  BaseDelayMs = 500,
}

export function isPosterDbWriteConfirmed(row: unknown, expectedUrl: string): boolean {
  const rec = recordFromJson(row)
  return readString(rec[GeneratePosterColumn.PosterUrl]) === expectedUrl
}

export function mergeStoryPlanPosterUrl(storyPlan: unknown, posterUrl: string): Record<string, unknown> {
  return omitBibleOwnedPlanFields({
    ...recordFromJson(storyPlan),
    [GeneratePosterPlanField.PosterUrl]: posterUrl,
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function writeEpisodePosterRow(input: {
  episodeId: string
  posterUrl: string
  posterPrompt: string
}): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data: current, error: readError } = await supabase
    .from(GeneratePosterTable.Episodes)
    .select(GeneratePosterColumn.StoryPlan)
    .eq(GeneratePosterColumn.Id, input.episodeId)
    .maybeSingle()
  if (readError) throw readError
  if (!current) throw new Error(GeneratePosterError.EpisodeNotFound)

  const { data, error } = await supabase
    .from(GeneratePosterTable.Episodes)
    .update({
      [GeneratePosterColumn.PosterUrl]: input.posterUrl,
      [GeneratePosterColumn.PosterPrompt]: input.posterPrompt,
      [GeneratePosterColumn.UpdatedAt]: new Date().toISOString(),
      [GeneratePosterColumn.StoryPlan]: mergeStoryPlanPosterUrl(
        recordFromJson(current)[GeneratePosterColumn.StoryPlan],
        input.posterUrl,
      ),
    })
    .eq(GeneratePosterColumn.Id, input.episodeId)
    .select(GeneratePosterColumn.PosterUrl)
    .maybeSingle()

  if (error) throw error
  if (!isPosterDbWriteConfirmed(data, input.posterUrl)) {
    throw new Error(GeneratePosterError.EpisodeNotFound)
  }
}

export async function persistEpisodePosterToDatabase(input: {
  episodeId: string
  posterUrl: string
  posterPrompt: string
}): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < PersistEpisodePosterRetry.Attempts; attempt += 1) {
    try {
      await writeEpisodePosterRow(input)
      logger.info(GeneratePosterLog.DbUpdated, {
        episodeId: input.episodeId,
        storedUrl: input.posterUrl,
      })
      return
    } catch (dbError) {
      lastError = dbError
      logger.error(GeneratePosterLog.DbFailed, {
        episodeId: input.episodeId,
        error: dbError,
        attempt,
      })
      if (attempt < PersistEpisodePosterRetry.Attempts - 1) {
        await delay(PersistEpisodePosterRetry.BaseDelayMs * (attempt + 1))
      }
    }
  }
  throw new Error(`${GeneratePosterError.DbUpdateFailed}: ${getErrorMessage(lastError)}`)
}
