import { logger, metadata } from '@trigger.dev/sdk/v3'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { generateMoodboardPayloadSchema } from './constants/task-payloads'
import {
  MOODBOARD_METADATA_PROGRESS,
  MOODBOARD_METADATA_PROJECT_ID,
  MOODBOARD_METADATA_PROVIDER,
  MOODBOARD_METADATA_STAGE,
  MOODBOARD_STAGE_BUILDING_PROMPT,
  MOODBOARD_STAGE_COMPLETED,
  MOODBOARD_STAGE_INITIALIZING,
  MOODBOARD_STAGE_UPDATING_DB,
  MOODBOARD_TASK_ID,
  MOODBOARD_IMAGE_GEN_FAILED,
} from './constants/moodboard-task-wire'
import { syncMoodboardToDatabase } from './generate-moodboard-db'
import { resolveMoodboardPrompts } from './build-moodboard-locked-prompts'
import { generateAllMoodboardImages } from './generate-moodboard-run'

export const generateMoodboard = defineOwnedTask({
  id: MOODBOARD_TASK_ID,
  schema: generateMoodboardPayloadSchema,
  queue: JobQueue.ImageProvider,
  maxDuration: 600,
  run: async payload => {
    const { projectId, providerConfig, replaceIndex } = payload

    logger.info(`Starting moodboard generation for project ${projectId}`, {
      provider: providerConfig.provider,
      promptIndex: payload.promptIndex,
      replaceIndex,
    })

    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_INITIALIZING)
    await metadata.set(MOODBOARD_METADATA_PROJECT_ID, projectId)
    await metadata.set(MOODBOARD_METADATA_PROVIDER, providerConfig.provider)

    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_BUILDING_PROMPT)
    const prompts = await resolveMoodboardPrompts(payload)

    const generatedFilenames = await generateAllMoodboardImages({ ...payload, prompts })
    if (generatedFilenames.length === 0) {
      throw new Error(MOODBOARD_IMAGE_GEN_FAILED)
    }

    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_UPDATING_DB)
    await metadata.set(MOODBOARD_METADATA_PROGRESS, 90)
    await syncMoodboardToDatabase(projectId, generatedFilenames, replaceIndex)

    await metadata.set(MOODBOARD_METADATA_PROGRESS, 100)
    await metadata.set(MOODBOARD_METADATA_STAGE, MOODBOARD_STAGE_COMPLETED)
    logger.info('Moodboard generation completed', { images: generatedFilenames })

    return { success: true, images: generatedFilenames }
  },
})
