import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import {
  generatePosterPayloadSchema,
  type GeneratePosterPayload,
} from './constants/task-payloads'
import { ApiframeGenerateAspectRatio } from '@/shared/ai/constants/apiframe'
import { persistGeneratedImage, resolveDurablePublicImageUrl } from './persist-generated-image'
import { persistEpisodePosterToDatabase } from './persist-episode-poster-db'
import { generateSelectedMjImage } from './generate-selected-mj-image'
import { buildPosterMidjourneyLockFlags } from './constants/locked-visual-prompt'
import {
  buildLockedEpisodePosterPrompt,
  lockedPosterPromptOrNull,
} from './build-episode-poster-locked-prompt'
import {
  EpisodePosterVariantCopy,
  GeneratePosterError,
  GeneratePosterFilename,
  GeneratePosterLog,
  GeneratePosterMetadataKey,
  GeneratePosterProgress,
  GeneratePosterStage,
  POSTER_LLM_TASK,
} from './constants/generate-poster-wire'

async function setPosterStage(
  progress: GeneratePosterProgress,
  stage: GeneratePosterStage,
): Promise<void> {
  await metadata.set(GeneratePosterMetadataKey.Progress, progress)
  await metadata.set(GeneratePosterMetadataKey.Stage, stage)
}

async function resolveLockedPosterPrompt(payload: GeneratePosterPayload): Promise<string> {
  const existing = lockedPosterPromptOrNull(payload.prompt)
  if (existing) return existing
  return buildLockedEpisodePosterPrompt({
    // Background job: no user, but the payload names the project it bills to.
    scope: systemScope(payload.projectId, SystemScopeReason.JobContext),
    context: {
      worldDesc: payload.worldDesc ?? '',
      overview: payload.overview ?? '',
    },
    extraPrompt: payload.extraPrompt ?? payload.prompt ?? '',
  })
}

export const generatePoster = defineOwnedTask({
  id: 'generate-poster',
  schema: generatePosterPayloadSchema,
  queue: JobQueue.Apiframe,
  maxDuration: 600,
  run: async payload => {
    const { projectId, episodeId, apiKey } = payload

    if (!apiKey) {
      throw new Error(GeneratePosterError.ApiframeKeyRequired)
    }
    if (!projectId || !episodeId) {
      throw new Error(GeneratePosterError.ProjectIdRequired)
    }

    await metadata.set(GeneratePosterMetadataKey.ProjectId, projectId)
    await metadata.set(GeneratePosterMetadataKey.EpisodeId, episodeId)
    await setPosterStage(GeneratePosterProgress.Init, GeneratePosterStage.Initializing)
    logger.info(GeneratePosterLog.Starting, { projectId, episodeId })

    await setPosterStage(GeneratePosterProgress.BuildingPrompt, GeneratePosterStage.BuildingPrompt)
    logger.info(GeneratePosterLog.BuildingPrompt, { episodeId })
    const lockedPrompt = await resolveLockedPosterPrompt(payload)
    await metadata.set(GeneratePosterMetadataKey.Prompt, lockedPrompt)

    const fullPrompt = buildPosterMidjourneyLockFlags(lockedPrompt)
    const generated = await generateSelectedMjImage({
      prompt: fullPrompt,
      subject: lockedPrompt,
      apiKey,
      aspectRatio: ApiframeGenerateAspectRatio.PortraitTwoThree,
      task: POSTER_LLM_TASK,
      variantInstruction: EpisodePosterVariantCopy.Instruction,
    })

    await setPosterStage(GeneratePosterProgress.Downloading, GeneratePosterStage.Downloading)
    const imgResponse = await fetch(generated.imageUrl)
    if (!imgResponse.ok) {
      throw new Error(`${GeneratePosterError.DownloadFailedPrefix} ${imgResponse.status}`)
    }

    await setPosterStage(GeneratePosterProgress.Saving, GeneratePosterStage.Saving)
    const filename = `${GeneratePosterFilename.Prefix}_${episodeId}_${Date.now()}.png`
    const persistedUrl = await persistGeneratedImage({
      projectId,
      filename,
      bytes: Buffer.from(await imgResponse.arrayBuffer()),
    })
    const storedUrl = resolveDurablePublicImageUrl(persistedUrl, generated.imageUrl)
    logger.info(GeneratePosterLog.Saved, { storedUrl, filename })

    await setPosterStage(GeneratePosterProgress.UpdatingDb, GeneratePosterStage.UpdatingDb)
    await persistEpisodePosterToDatabase({
      episodeId,
      posterUrl: storedUrl,
      posterPrompt: fullPrompt,
    })

    await setPosterStage(GeneratePosterProgress.Completed, GeneratePosterStage.Completed)

    return {
      success: true,
      imageUrl: storedUrl,
      isVariantGrid: false,
      jobId: generated.jobId,
      variantIndex: generated.variantIndex,
      episodeId,
    }
  },
})
