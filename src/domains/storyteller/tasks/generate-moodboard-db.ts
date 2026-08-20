import { logger } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import {
  MOODBOARD_APPEND_INDEX,
  MOODBOARD_COL_CONTENT,
  MOODBOARD_COL_ID,
  MOODBOARD_COL_PROJECT_ID,
  MOODBOARD_COL_SERIES_BIBLE,
  MOODBOARD_COL_UPDATED_AT,
  MOODBOARD_DB_FAILED,
  MOODBOARD_DB_UPDATE_FAILED,
  MOODBOARD_DB_UPDATED,
  MOODBOARD_MOOD_IMAGES_KEY,
  MOODBOARD_PROJECT_NOT_FOUND,
  MOODBOARD_TABLE_PROJECTS,
  MOODBOARD_TABLE_SERIES_BIBLES,
} from './constants/moodboard-task-wire'

export enum PersistMoodboardRetry {
  Attempts = 3,
  BaseDelayMs = 500,
}

export function uniqueMoodImageUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const url of urls) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    unique.push(url)
  }
  return unique
}

export function mergeMoodImages(
  currentImages: string[],
  generatedUrls: string[],
  replaceIndex?: number,
): string[] {
  if (typeof replaceIndex === 'number' && replaceIndex >= 0) {
    const nextImages = uniqueMoodImageUrls(currentImages)
    while (nextImages.length <= replaceIndex) nextImages.push('')
    if (generatedUrls[0]) nextImages[replaceIndex] = generatedUrls[0]
    return uniqueMoodImageUrls(nextImages)
  }
  return uniqueMoodImageUrls(generatedUrls)
}

export function mergeSeriesBibleMoodImages(
  currentBible: Record<string, unknown>,
  generatedUrls: string[],
  replaceIndex?: number,
): Record<string, unknown> {
  return {
    ...currentBible,
    [MOODBOARD_MOOD_IMAGES_KEY]: mergeMoodImages(
      stringArrayFromJson(currentBible[MOODBOARD_MOOD_IMAGES_KEY]),
      generatedUrls,
      replaceIndex,
    ),
  }
}

export function moodImagesFromBible(bible: unknown): string[] {
  return stringArrayFromJson(recordFromJson(bible)[MOODBOARD_MOOD_IMAGES_KEY])
}

export function isMoodboardDbWriteConfirmed(
  bible: unknown,
  expectedUrls: string[],
  replaceIndex?: number,
): boolean {
  const images = moodImagesFromBible(bible)
  const first = expectedUrls[0]
  if (!first) return false
  if (typeof replaceIndex === 'number' && replaceIndex >= 0) {
    return images[replaceIndex] === first
  }
  return expectedUrls.every(url => images.includes(url))
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function writeProjectSeriesBible(
  projectId: string,
  bible: Record<string, unknown>,
  generatedUrls: string[],
  replaceIndex?: number,
): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from(MOODBOARD_TABLE_PROJECTS)
    .update({ [MOODBOARD_COL_SERIES_BIBLE]: bible })
    .eq(MOODBOARD_COL_ID, projectId)
    .select(MOODBOARD_COL_SERIES_BIBLE)
    .maybeSingle()

  if (error) throw error
  if (
    !isMoodboardDbWriteConfirmed(
      recordFromJson(data)[MOODBOARD_COL_SERIES_BIBLE],
      generatedUrls,
      replaceIndex,
    )
  ) {
    throw new Error(MOODBOARD_PROJECT_NOT_FOUND)
  }
}

async function persistSeriesBible(
  projectId: string,
  bible: Record<string, unknown>,
  generatedUrls: string[],
  replaceIndex?: number,
): Promise<void> {
  await writeProjectSeriesBible(projectId, bible, generatedUrls, replaceIndex)

  const supabase = createSupabaseServiceClient()
  const { data: bibleRow } = await supabase
    .from(MOODBOARD_TABLE_SERIES_BIBLES)
    .select(MOODBOARD_COL_CONTENT)
    .eq(MOODBOARD_COL_PROJECT_ID, projectId)
    .maybeSingle()

  if (!bibleRow) return

  const { error: bibleError } = await supabase
    .from(MOODBOARD_TABLE_SERIES_BIBLES)
    .update({
      [MOODBOARD_COL_CONTENT]: {
        ...recordFromJson(bibleRow.content),
        [MOODBOARD_MOOD_IMAGES_KEY]: bible[MOODBOARD_MOOD_IMAGES_KEY],
      },
      [MOODBOARD_COL_UPDATED_AT]: new Date().toISOString(),
    })
    .eq(MOODBOARD_COL_PROJECT_ID, projectId)
  if (bibleError) throw bibleError
}

export async function syncMoodboardToDatabase(
  projectId: string,
  generatedUrls: string[],
  replaceIndex?: number,
): Promise<void> {
  if (generatedUrls.length === 0) return
  let lastError: unknown
  for (let attempt = 0; attempt < PersistMoodboardRetry.Attempts; attempt += 1) {
    try {
      const supabase = createSupabaseServiceClient()
      const { data: project } = await supabase
        .from(MOODBOARD_TABLE_PROJECTS)
        .select(MOODBOARD_COL_SERIES_BIBLE)
        .eq(MOODBOARD_COL_ID, projectId)
        .single()
      if (!project) {
        throw new Error(MOODBOARD_PROJECT_NOT_FOUND)
      }
      const nextBible = mergeSeriesBibleMoodImages(
        recordFromJson(project.series_bible),
        generatedUrls,
        replaceIndex,
      )
      await persistSeriesBible(projectId, nextBible, generatedUrls, replaceIndex)
      logger.info(MOODBOARD_DB_UPDATED, {
        index: replaceIndex ?? MOODBOARD_APPEND_INDEX,
        count: stringArrayFromJson(nextBible[MOODBOARD_MOOD_IMAGES_KEY]).length,
      })
      return
    } catch (dbError) {
      lastError = dbError
      logger.error(MOODBOARD_DB_FAILED, { projectId, error: dbError, attempt })
      if (attempt < PersistMoodboardRetry.Attempts - 1) {
        await delay(PersistMoodboardRetry.BaseDelayMs * (attempt + 1))
      }
    }
  }
  throw new Error(`${MOODBOARD_DB_UPDATE_FAILED}: ${getErrorMessage(lastError)}`)
}
