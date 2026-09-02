import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { generatePortraitPayloadSchema } from './constants/task-payloads'
import { persistGeneratedImage, resolveDurablePublicImageUrl } from './persist-generated-image'
import { persistCharacterPortraitToDatabase } from './persist-character-portrait-db'
import { generateSelectedPortraitImage } from './generate-portrait-run'
import {
  GeneratePortraitDir,
  GeneratePortraitError,
  GeneratePortraitFilename,
  GeneratePortraitLog,
  GeneratePortraitMetadataKey,
  GeneratePortraitProgress,
  GeneratePortraitStage,
  isPortraitCharacterUuid,
} from './constants/generate-portrait-wire'

async function setPortraitStage(
  progress: GeneratePortraitProgress,
  stage: GeneratePortraitStage,
): Promise<void> {
  await metadata.set(GeneratePortraitMetadataKey.Progress, progress)
  await metadata.set(GeneratePortraitMetadataKey.Stage, stage)
}

export const generatePortrait = defineOwnedTask({
  id: 'generate-portrait',
  schema: generatePortraitPayloadSchema,
  queue: JobQueue.Apiframe,
  maxDuration: 600,
  run: async payload => {
    const { prompt, projectId, characterId, apiKey } = payload

    if (!apiKey) {
      throw new Error(GeneratePortraitError.ApiframeKeyRequired)
    }

    if (!projectId) {
      throw new Error(GeneratePortraitError.ProjectIdRequired)
    }

    await metadata.set(GeneratePortraitMetadataKey.ProjectId, projectId)
    await metadata.set(GeneratePortraitMetadataKey.Prompt, prompt)
    if (characterId) {
      await metadata.set(GeneratePortraitMetadataKey.CharacterId, characterId)
    }
    await setPortraitStage(GeneratePortraitProgress.Init, GeneratePortraitStage.Initializing)

    logger.info(GeneratePortraitLog.Starting, {
      projectId,
      characterId,
      prompt,
    })

    const generated = await generateSelectedPortraitImage(prompt, apiKey)

    await setPortraitStage(GeneratePortraitProgress.Downloading, GeneratePortraitStage.Downloading)
    const imgResponse = await fetch(generated.imageUrl)
    if (!imgResponse.ok) {
      throw new Error(`${GeneratePortraitError.DownloadFailedPrefix} ${imgResponse.status}`)
    }
    const buffer = Buffer.from(await imgResponse.arrayBuffer())

    await setPortraitStage(GeneratePortraitProgress.Saving, GeneratePortraitStage.Saving)
    const idPart = isPortraitCharacterUuid(characterId)
      ? characterId
      : GeneratePortraitFilename.Draft
    const filename = `${GeneratePortraitDir.Portraits}/${GeneratePortraitFilename.Prefix}_${idPart}_${Date.now()}.png`
    const persistedUrl = await persistGeneratedImage({
      projectId,
      filename,
      bytes: buffer,
    })
    const storedUrl = resolveDurablePublicImageUrl(persistedUrl, generated.imageUrl)
    logger.info(GeneratePortraitLog.Saved, { storedUrl, filename })

    if (!isPortraitCharacterUuid(characterId)) {
      logger.info(GeneratePortraitLog.DbSkipped, { characterId })
    } else {
      await setPortraitStage(GeneratePortraitProgress.UpdatingDb, GeneratePortraitStage.UpdatingDb)
      await persistCharacterPortraitToDatabase({
        characterId,
        portraitUrl: storedUrl,
      })
    }

    await setPortraitStage(GeneratePortraitProgress.Completed, GeneratePortraitStage.Completed)

    return {
      success: true,
      imageUrl: storedUrl,
      isVariantGrid: false,
      jobId: generated.jobId,
      variantIndex: generated.variantIndex,
      characterId: characterId,
    }
  },
})
