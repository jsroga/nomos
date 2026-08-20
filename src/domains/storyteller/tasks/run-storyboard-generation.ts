import { logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { BufferEncoding, FsDirectory } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { ApiframeGenerateAspectRatio } from '@/shared/ai/constants/apiframe'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'
import { StorytellerAnswerSeparator } from '@/domains/storyteller/core/storyteller-page-wire'
import { extractVisibleBeatCast } from '@/domains/storyteller/services/beat-cast-extract-service'
import { buildBeatExtractText } from '@/domains/storyteller/services/constants/beat-cast-extract'
import {
  StoryboardBeatColumn,
  StoryboardBeatLog,
  StoryboardBeatTable,
  StoryboardGenerationMetadataKey,
  StoryboardGenerationProgress,
  StoryboardGenerationStage,
} from './constants/storyboard-beat-generation'
import { buildStoryboardBeatPrompt } from './constants/storyboard-beat-prompt'
import {
  beatCastExtractFields,
  loadStoryboardBeatCast,
  resolveBeatCastRefs,
} from './storyboard-beat-cast'

interface GenerateStoryboardPayload {
  beatId: string
  projectId: string
  prompt: string
  providerConfig: {
    provider: typeof ImageGenProvider.NanoBanana
    apiKey: string
    modelId?: string
  }
}

export async function runStoryboardGeneration(payload: GenerateStoryboardPayload) {
  const { beatId, projectId, prompt, providerConfig } = payload
  const { apiKey, modelId } = providerConfig

  logger.info(`${StoryboardBeatLog.Starting} ${beatId}`, { prompt })

  await metadata.set(StoryboardGenerationMetadataKey.BeatId, beatId)
  await metadata.set(StoryboardGenerationMetadataKey.ProjectId, projectId)
  await metadata.set(
    StoryboardGenerationMetadataKey.Progress,
    StoryboardGenerationProgress.Start,
  )
  await metadata.set(
    StoryboardGenerationMetadataKey.Stage,
    StoryboardGenerationStage.ExtractingCast,
  )

  const loaded = await loadStoryboardBeatCast(beatId, projectId)
  const members = await extractVisibleBeatCast({
    beatText: buildBeatExtractText(beatCastExtractFields(loaded, prompt)),
    roster: loaded.roster,
    hintedNames: loaded.hintedNames,
  })
  const refs = await resolveBeatCastRefs(projectId, members)
  const enhancedPrompt = buildStoryboardBeatPrompt(prompt, {
    referencedNames: refs.referenced.map(ref => ref.name),
    unreferencedNames: refs.unreferencedNames,
  })
  const imageInputUrls = refs.referenced.map(ref => ref.url)

  await metadata.set(
    StoryboardGenerationMetadataKey.CastNames,
    members.map(member => member.name).join(StorytellerAnswerSeparator.CommaSpace),
  )
  await metadata.set(StoryboardGenerationMetadataKey.RefCount, imageInputUrls.length)
  await metadata.set(
    StoryboardGenerationMetadataKey.Progress,
    StoryboardGenerationProgress.CastResolved,
  )
  logger.info(StoryboardBeatLog.CastResolved, {
    beatId,
    names: members.map(member => member.name),
    refCount: imageInputUrls.length,
  })

  await metadata.set(
    StoryboardGenerationMetadataKey.Stage,
    StoryboardGenerationStage.GeneratingImage,
  )
  logger.info(StoryboardBeatLog.Generating)
  const imageBase64 = await generateNanoBananaBase64({
    prompt: enhancedPrompt,
    apiKey,
    modelId,
    aspectRatio: ApiframeGenerateAspectRatio.Widescreen,
    ...(imageInputUrls.length > 0 ? { imageInputUrls } : {}),
  })

  await metadata.set(
    StoryboardGenerationMetadataKey.Stage,
    StoryboardGenerationStage.SavingImage,
  )
  await metadata.set(
    StoryboardGenerationMetadataKey.Progress,
    StoryboardGenerationProgress.ImageReady,
  )

  const filename = `storyboard_${beatId}_${Date.now()}.png`
  const projectDir = path.join(process.cwd(), FsDirectory.Public, FsDirectory.Projects, projectId)
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(path.join(projectDir, filename), Buffer.from(imageBase64, BufferEncoding.Base64))

  const localPath = filename
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from(StoryboardBeatTable.Beats)
    .update({ [StoryboardBeatColumn.ImageUrl]: localPath })
    .eq(StoryboardBeatColumn.Id, beatId)
  if (error) logger.error(StoryboardBeatLog.UpdateFailed, { error: getErrorMessage(error) })

  await metadata.set(
    StoryboardGenerationMetadataKey.Stage,
    StoryboardGenerationStage.Completed,
  )
  await metadata.set(
    StoryboardGenerationMetadataKey.Progress,
    StoryboardGenerationProgress.Done,
  )

  return { success: true, imageUrl: localPath, beatId }
}
