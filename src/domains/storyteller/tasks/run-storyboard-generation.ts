import { logger, metadata } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  BufferEncoding,
  ContentType,
  FsDirectory,
  GoogleModelId,
  HttpMethod,
} from '@/shared/data/constants/protocol'
import { GeminiResponseModality } from '@/shared/data/constants/repaint-gemini'
import { ImageGenProvider } from '@/shared/ai/constants/image-providers'

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

const DEFAULT_STORYBOARD_MODEL = GoogleModelId.Gemini20FlashPreviewImageGeneration

function extractGeminiImageBase64(data: {
  candidates?: Array<{ content?: { parts?: Array<{ inline_data?: { data?: string }; inlineData?: { data?: string } }> } }>
}): string | null {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts) return null

  for (const part of parts) {
    if (part.inline_data?.data) return part.inline_data.data
    if (part.inlineData?.data) return part.inlineData.data
  }

  return null
}

export async function runStoryboardGeneration(payload: GenerateStoryboardPayload) {
  const { beatId, projectId, prompt, providerConfig } = payload
  const { apiKey, modelId } = providerConfig

  logger.info(`Starting storyboard generation for beat ${beatId}`, { prompt })

  await metadata.set('beat_id', beatId)
  await metadata.set('project_id', projectId)
  await metadata.set('progress', 0)

  await metadata.set('stage', 'generating_image')
  const targetModel = modelId || DEFAULT_STORYBOARD_MODEL
  const enhancedPrompt = `${prompt}. Rough white-and-dark storyboard sketch, high contrast, cinematic framing, rough lines. Create a single best frame for this action.`

  logger.info('Generating with Nano Banana (Gemini)', { model: targetModel })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
    {
      method: HttpMethod.Post,
      headers: { 'Content-Type': ContentType.Json },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          responseModalities: [GeminiResponseModality.Text, GeminiResponseModality.Image],
        },
      }),
    },
  )

  if (!response.ok) {
    const errText = await response.text()
    logger.error('Gemini API Error', { error: errText })
    throw new Error(`Gemini API Error: ${errText}`)
  }

  const data = await response.json()
  const imageBase64 = extractGeminiImageBase64(data)
  if (!imageBase64) {
    throw new Error('No image data returned from Gemini API')
  }

  await metadata.set('stage', 'saving_image')
  await metadata.set('progress', 50)

  const filename = `beat_${beatId}_${Date.now()}.png`
  const projectDir = path.join(
    process.cwd(),
    FsDirectory.Public,
    FsDirectory.Projects,
    projectId,
  )
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(projectDir, filename),
    Buffer.from(imageBase64, BufferEncoding.Base64),
  )
  logger.info('Image saved to disk', { filename })

  await metadata.set('stage', 'updating_database')
  await metadata.set('progress', 80)

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('beats')
    .update({ image_url: filename, image_prompt: enhancedPrompt })
    .eq('id', beatId)

  if (error) {
    throw new Error(`Database update failed: ${getErrorMessage(error)}`)
  }

  await metadata.set('progress', 100)
  await metadata.set('stage', 'completed')
  logger.info('Storyboard generation completed successfully', { beatId, filename })

  return {
    success: true,
    beatId,
    imageUrl: filename,
    fullUrl: `/projects/${projectId}/${filename}`,
  }
}
