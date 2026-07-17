import { logger } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import {
  MOODBOARD_APPEND_INDEX,
  MOODBOARD_COL_CONTENT,
  MOODBOARD_COL_ID,
  MOODBOARD_COL_PROJECT_ID,
  MOODBOARD_COL_STORY_PLAN,
  MOODBOARD_COL_UPDATED_AT,
  MOODBOARD_DB_UPDATED,
  MOODBOARD_MOOD_IMAGES_KEY,
  MOODBOARD_PROJECT_NOT_FOUND,
  MOODBOARD_TABLE_PROJECTS,
  MOODBOARD_TABLE_STORY_PLANS,
} from './constants/moodboard-task-wire'

function mergeMoodImages(
  currentImages: string[],
  generatedFilenames: string[],
  replaceIndex?: number,
): string[] {
  if (typeof replaceIndex === 'number' && replaceIndex >= 0) {
    const newImages = [...currentImages]
    while (newImages.length <= replaceIndex) newImages.push('')
    if (generatedFilenames[0]) newImages[replaceIndex] = generatedFilenames[0]
    return newImages
  }
  return [...currentImages, ...generatedFilenames]
}

async function persistMoodboardContent(
  projectId: string,
  newContent: Record<string, unknown>,
): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { error: legacyError } = await supabase
    .from(MOODBOARD_TABLE_PROJECTS)
    .update({ [MOODBOARD_COL_STORY_PLAN]: newContent })
    .eq(MOODBOARD_COL_ID, projectId)
  if (legacyError) throw legacyError
  const { error: primaryError } = await supabase.from(MOODBOARD_TABLE_STORY_PLANS).upsert(
    {
      [MOODBOARD_COL_PROJECT_ID]: projectId,
      [MOODBOARD_COL_CONTENT]: newContent,
      [MOODBOARD_COL_UPDATED_AT]: new Date().toISOString(),
    },
    { onConflict: MOODBOARD_COL_PROJECT_ID },
  )
  if (primaryError) throw primaryError
}

export async function syncMoodboardToDatabase(
  projectId: string,
  generatedFilenames: string[],
  replaceIndex?: number,
): Promise<void> {
  if (generatedFilenames.length === 0) return
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const supabase = createSupabaseServiceClient()
      const { data: storyPlanRow } = await supabase
        .from(MOODBOARD_TABLE_STORY_PLANS)
        .select(MOODBOARD_COL_CONTENT)
        .eq(MOODBOARD_COL_PROJECT_ID, projectId)
        .single()
      const { data: project } = await supabase
        .from(MOODBOARD_TABLE_PROJECTS)
        .select(MOODBOARD_COL_STORY_PLAN)
        .eq(MOODBOARD_COL_ID, projectId)
        .single()
      if (!project) {
        logger.error(MOODBOARD_PROJECT_NOT_FOUND)
        break
      }
      const currentContent = storyPlanRow?.content || project.story_plan || {}
      const rawMoodImages = currentContent[MOODBOARD_MOOD_IMAGES_KEY]
      const currentImages = Array.isArray(rawMoodImages)
        ? rawMoodImages.filter((entry): entry is string => typeof entry === 'string')
        : []
      const newContent = {
        ...currentContent,
        [MOODBOARD_MOOD_IMAGES_KEY]: mergeMoodImages(currentImages, generatedFilenames, replaceIndex),
      }
      await persistMoodboardContent(projectId, newContent)
      logger.info(MOODBOARD_DB_UPDATED, {
        index: replaceIndex ?? MOODBOARD_APPEND_INDEX,
        count: newContent[MOODBOARD_MOOD_IMAGES_KEY].length,
      })
      break
    } catch (dbError) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      else logger.error(`Database error on attempt ${attempt + 1}`, { error: dbError })
    }
  }
}
