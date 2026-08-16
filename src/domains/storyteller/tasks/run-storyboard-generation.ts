import { logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { BufferEncoding, FsDirectory } from '@/shared/data/constants/protocol'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'
import { generateNanoBananaBase64 } from '@/shared/ai/apiframe-nano-banana'

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

  logger.info(`Starting storyboard generation for beat ${beatId}`, { prompt })

  await metadata.set('beat_id', beatId)
  await metadata.set('project_id', projectId)
  await metadata.set('progress', 0)

  await metadata.set('stage', 'generating_image')
  const enhancedPrompt = `${prompt}. Rough white-and-dark storyboard sketch, high contrast, cinematic framing, rough lines. Create a single best frame for this action.`

  logger.info('Generating storyboard via Apiframe Nano Banana')
  const imageBase64 = await generateNanoBananaBase64({
    prompt: enhancedPrompt,
    apiKey,
    modelId,
    aspectRatio: '16:9',
  })

  await metadata.set('stage', 'saving_image')
  await metadata.set('progress', 50)

  const filename = `storyboard_${beatId}_${Date.now()}.png`
  const projectDir = path.join(process.cwd(), FsDirectory.Public, FsDirectory.Projects, projectId)
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(path.join(projectDir, filename), Buffer.from(imageBase64, BufferEncoding.Base64))

  // Relative to /projects/{projectId}/ — UI prefixes the public path
  const localPath = filename
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.from('beats').update({ image_url: localPath }).eq('id', beatId)
  if (error) logger.error('Failed to update beat image_url', { error: getErrorMessage(error) })

  await metadata.set('stage', 'completed')
  await metadata.set('progress', 100)

  return { success: true, imageUrl: localPath, beatId }
}
