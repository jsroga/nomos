import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import {
  MOODBOARD_METADATA_PROGRESS,
  MOODBOARD_METADATA_PROJECT_ID,
  MOODBOARD_METADATA_PROVIDER,
  MOODBOARD_METADATA_STAGE,
  MOODBOARD_STAGE_COMPLETED,
  MOODBOARD_STAGE_INITIALIZING,
  MOODBOARD_STAGE_UPDATING_DB,
  MOODBOARD_TASK_ID,
} from './constants/moodboard-task-wire'
import { syncMoodboardToDatabase } from './generate-moodboard-db'
import {
  collectMoodboardStyleReferences,
  generateAllMoodboardImages,
  type GenerateMoodboardPayload,
} from './generate-moodboard-run'

export const generateMoodboard = task({
  id: MOODBOARD_TASK_ID,
  maxDuration: 600,
  run: async (payload: GenerateMoodboardPayload) => {
    const { projectId, prompts, providerConfig, replaceIndex } = payload

    logger.info(`Starting moodboard generation for project ${projectId}`, {
      provider: providerConfig.provider,
      promptCount: prompts.length,
      replaceIndex,
    })

    await metadata.set(MOODBOARD_METADATA_PROGRESS, 0)
    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_INITIALIZING)
    await metadata.set(MOODBOARD_METADATA_PROJECT_ID, projectId)
    await metadata.set(MOODBOARD_METADATA_PROVIDER, providerConfig.provider)

    const generatedFilenames = await generateAllMoodboardImages(
      payload,
      collectMoodboardStyleReferences(payload),
    )

    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_UPDATING_DB)
    await metadata.set(MOODBOARD_METADATA_PROGRESS, 90)
    await syncMoodboardToDatabase(projectId, generatedFilenames, replaceIndex)

    await metadata.set(MOODBOARD_METADATA_PROGRESS, 100)
    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_COMPLETED)
    logger.info('Moodboard generation completed', { images: generatedFilenames })

    return { success: true, images: generatedFilenames }
  },
})
