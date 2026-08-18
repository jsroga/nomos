import { task } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { generateApiframeSurfaceImage } from '@/shared/ai/generate-apiframe-surface-image'
import {
  ApiframeGenerateAspectRatio,
  ApiframeImageModel,
} from '@/shared/ai/constants/apiframe'
import {
  ImagePosterSurface,
  parseImageGenerateModel,
  resolvePosterGenerateModel,
} from '@/shared/ai/image-model-env'
import { FsDirectory } from '@/shared/data/constants/protocol'

enum PosterAssetDir {
  Posters = 'posters',
}

enum PosterPrompt {
  Midjourney = 'movie poster for ',
  MidjourneySuffix = ', cinematic lighting, high resolution, detailed, textless',
  GenericSuffix = '. Movie poster style, cinematic composition, dramatic lighting, high resolution, highly detailed, vertical aspect ratio.',
}

interface GeneratePosterPayload {
  prompt: string
  projectId: string
  episodeId: string
  apiKey: string
  styleReferenceUrls?: string[]
  modelId?: string
}

function posterPromptForModel(prompt: string, model: ApiframeImageModel): string {
  if (model === ApiframeImageModel.Midjourney) {
    return `${PosterPrompt.Midjourney}${prompt}${PosterPrompt.MidjourneySuffix}`
  }
  return `${prompt}${PosterPrompt.GenericSuffix}`
}

async function downloadImageBuffer(imageUrl: string): Promise<Buffer> {
  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) {
    throw new Error(`Failed to download image from URL: ${imgResponse.status}`)
  }
  return Buffer.from(await imgResponse.arrayBuffer())
}

export const generatePoster = task({
  id: 'generate-poster',
  maxDuration: 600,
  run: async (payload: GeneratePosterPayload) => {
    const { prompt, projectId, episodeId, apiKey, styleReferenceUrls } = payload

    console.log(
      `Starting poster generation for episode ${episodeId}, prompt: ${prompt.substring(0, 50)}...`
    )

    if (!apiKey) {
      throw new Error('Apiframe API key is required')
    }

    if (!projectId || !episodeId) {
      throw new Error('projectId and episodeId are required')
    }

    const model = parseImageGenerateModel(
      payload.modelId,
      resolvePosterGenerateModel(ImagePosterSurface.Series),
    )
    const generated = await generateApiframeSurfaceImage({
      model,
      prompt: posterPromptForModel(prompt, model),
      apiKey,
      aspectRatio: ApiframeGenerateAspectRatio.PortraitTwoThree,
      styleReferenceUrls,
    })

    console.log('Generation successful:', generated.imageUrl)

    const buffer = await downloadImageBuffer(generated.imageUrl)
    const filename = `poster_${episodeId}_${Date.now()}.png`
    const projectDir = path.join(
      process.cwd(),
      FsDirectory.Public,
      FsDirectory.Projects,
      projectId,
      PosterAssetDir.Posters,
    )

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Poster saved to ${filePath}`)

    const localPath = `${PosterAssetDir.Posters}/${filename}`

    const supabase = createSupabaseServiceClient()

    const { error: dbError } = await supabase
      .from('episodes')
      .update({
        poster_url: localPath,
        poster_prompt: prompt,
      })
      .eq('id', episodeId)

    if (dbError) {
      console.error('Failed to update episode in DB:', dbError)
    } else {
      console.log(`Episode ${episodeId} poster_url updated to ${localPath}`)
    }

    return {
      success: true,
      imageUrl: localPath,
      isVariantGrid: generated.isVariantGrid,
      jobId: generated.jobId,
      episodeId: episodeId,
    }
  },
})
