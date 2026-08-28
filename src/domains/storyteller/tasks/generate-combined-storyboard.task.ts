import { logger, metadata } from '@trigger.dev/sdk'
import { JobQueue, defineOwnedTask } from '@/shared/jobs'
import { generateCombinedStoryboardPayloadSchema } from './constants/task-payloads'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { ContentType, ImageFileExtension, VideoFileExtension } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { resolveApiframeApiKey } from '@/shared/ai/image-model-env'
import { buildVideoGenerateBody, generateApiframeVideo } from '@/shared/ai/apiframe-video'
import {
  resolveStoryboardVideoDuration,
  resolveStoryboardVideoLook,
  resolveStoryboardVideoModel,
} from '@/shared/ai/storyboard-video-env'
import {
  logLLMRequestComplete,
  logLLMRequestError,
  logLLMRequestStart,
} from '@/trigger/utils/llm-logger'
import { isPublicHttpsUrl } from './persist-generated-image'
import { composeStoryboardContactSheet } from './compose-storyboard-contact-sheet'
import { generateStoryboardVideoCorePrompt } from './storyboard-video-core-prompt'
import { mixStoryboardVoiceover } from './storyboard-video-voiceover'
import { CONTACT_SHEET_HTTPS_REQUIRED } from './constants/storyboard-video-sheet'
import {
  CombinedStoryboardLog,
  CombinedStoryboardMetadataKey,
  CombinedStoryboardStage,
  COMBINED_STORYBOARD_ERROR,
  persistCombinedStoryboardMedia,
  persistEpisodeStoryboardUrl,
  beatsWithImageUrl,
  storyboardKlingDirectorFields,
} from './generate-combined-storyboard-helpers'

export const generateCombinedStoryboard = defineOwnedTask({
  id: TRIGGER_TASK_ID.GENERATE_COMBINED_STORYBOARD,
  schema: generateCombinedStoryboardPayloadSchema,
  queue: JobQueue.Apiframe,
  maxDuration: 900,
  retry: { maxAttempts: 1 },
  run: async payload => {
    const { episodeId, projectId, beats } = payload
    const apiKey = resolveApiframeApiKey()
    if (!apiKey) {
      throw new Error(COMBINED_STORYBOARD_ERROR.MissingApiKey)
    }

    const imaged = beatsWithImageUrl(beats)
    if (imaged.length === 0) {
      throw new Error(API_ERROR.BEAT_IMAGES_REQUIRED)
    }

    const model = resolveStoryboardVideoModel(undefined, payload.model)
    const look = resolveStoryboardVideoLook(payload.look)
    const duration = resolveStoryboardVideoDuration(undefined, model)
    const director = storyboardKlingDirectorFields(model, imaged, duration, look)

    logger.info(CombinedStoryboardLog.Starting, {
      episodeId,
      projectId,
      beatCount: imaged.length,
      model,
      look,
      duration,
    })

    await metadata.set(CombinedStoryboardMetadataKey.EpisodeId, episodeId)
    await metadata.set(CombinedStoryboardMetadataKey.ProjectId, projectId)
    await metadata.set(CombinedStoryboardMetadataKey.BeatCount, imaged.length)
    await metadata.set(CombinedStoryboardMetadataKey.Model, model)
    await metadata.set(CombinedStoryboardMetadataKey.Look, look)
    await metadata.set(CombinedStoryboardMetadataKey.Duration, duration)
    await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Summarizing)

    const core = await generateStoryboardVideoCorePrompt(imaged, undefined, look, model)
    const prompt = core.prompt
    await metadata.set(CombinedStoryboardMetadataKey.Prompt, prompt)
    await metadata.set(CombinedStoryboardMetadataKey.CorePromptSource, core.source)
    logger.info(CombinedStoryboardLog.CorePrompt, {
      source: core.source,
      prompt,
      multiPrompt: director.multiPrompt,
    })

    logger.info(CombinedStoryboardLog.Composing, {
      beatCount: imaged.length,
      imageUrls: imaged.map(beat => beat.imageUrl),
    })

    try {
      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Composing)
      const sheetBytes = await composeStoryboardContactSheet(projectId, imaged)
      logger.info(CombinedStoryboardLog.SheetReady, { bytes: sheetBytes.length })

      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Uploading)
      const sheetUrl = await persistCombinedStoryboardMedia(
        projectId,
        `storyboard_sheet_${episodeId}_${Date.now()}${ImageFileExtension.Png}`,
        sheetBytes,
        ContentType.Png,
      )
      if (!isPublicHttpsUrl(sheetUrl)) {
        throw new Error(CONTACT_SHEET_HTTPS_REQUIRED)
      }
      await metadata.set(CombinedStoryboardMetadataKey.StartImage, sheetUrl)
      logger.info(CombinedStoryboardLog.SheetUploaded, { sheetUrl })

      const videoOptions = {
        apiKey,
        prompt,
        startImageUrl: sheetUrl,
        model,
        duration,
        generateAudio: true,
        ...director,
      }
      const requestBody = buildVideoGenerateBody(videoOptions)
      logger.info(CombinedStoryboardLog.Prompt, {
        model,
        look,
        duration,
        generateAudio: true,
        startImageUrl: sheetUrl,
        prompt,
        requestBody,
        ...director,
      })
      logLLMRequestStart({
        provider: ImageGenProvider.Apiframe,
        model,
        prompt,
        inputImageUrls: [sheetUrl],
        input: requestBody,
        metadata: {
          task: TRIGGER_TASK_ID.GENERATE_COMBINED_STORYBOARD,
          episodeId,
          duration,
          generateAudio: true,
          ...director,
        },
      })

      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Generating)
      const generated = await generateApiframeVideo({
        ...videoOptions,
        onJobAccepted: async jobId => {
          await metadata.set(CombinedStoryboardMetadataKey.JobId, jobId)
          logger.info(CombinedStoryboardLog.JobAccepted, { jobId, model, startImageUrl: sheetUrl })
        },
      })

      logLLMRequestComplete({
        provider: ImageGenProvider.Apiframe,
        model,
        prompt,
        outputImageUrls: [generated.videoUrl],
        output: { jobId: generated.jobId, videoUrl: generated.videoUrl },
      })

      const videoResponse = await fetch(generated.videoUrl)
      if (!videoResponse.ok) {
        throw new Error(`${COMBINED_STORYBOARD_ERROR.DownloadVideo}: ${videoResponse.status}`)
      }
      const videoBytes = Buffer.from(await videoResponse.arrayBuffer())

      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Voiceover)
      const voiced = await mixStoryboardVoiceover({
        videoBytes,
        beats: imaged,
        duration,
        look,
      })
      await metadata.set(CombinedStoryboardMetadataKey.VoiceoverSource, voiced.source)
      if (voiced.skip) {
        await metadata.set(CombinedStoryboardMetadataKey.VoiceoverSkip, voiced.skip)
      }
      logger.info(CombinedStoryboardLog.Voiceover, {
        source: voiced.source,
        skip: voiced.skip,
        script: voiced.script,
      })

      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Saving)
      const imageUrl = await persistCombinedStoryboardMedia(
        projectId,
        `storyboard_video_${episodeId}_${Date.now()}${VideoFileExtension.Mp4}`,
        voiced.bytes,
        ContentType.Mp4,
      )

      await metadata.set(CombinedStoryboardMetadataKey.Stage, CombinedStoryboardStage.Updating)
      await persistEpisodeStoryboardUrl(episodeId, imageUrl, prompt)

      logger.info(CombinedStoryboardLog.Completed, { episodeId, imageUrl, jobId: generated.jobId })

      return {
        success: true,
        episodeId,
        imageUrl,
        fullUrl: imageUrl,
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      logLLMRequestError({
        provider: ImageGenProvider.Apiframe,
        model,
        prompt,
        error: message,
      })
      logger.error(CombinedStoryboardLog.Failed, { error: message })
      throw error
    }
  },
})
