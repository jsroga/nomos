import { task } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { generateMidjourneyImages, pickApiframeImageUrl } from '@/shared/ai/apiframe'

interface GeneratePosterPayload {
  prompt: string
  projectId: string
  episodeId: string
  apiKey: string
  styleReferenceUrls?: string[]
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

    let imagePromptPart = ''
    let srefParam = ''
    if (styleReferenceUrls && styleReferenceUrls.length > 0) {
      imagePromptPart = `${styleReferenceUrls[0]} `
      srefParam = ` --sref ${styleReferenceUrls.join(' ')}`
    }

    const fullPrompt = `${imagePromptPart}movie poster for ${prompt}, cinematic lighting, high resolution, detailed, textless --ar 2:3${srefParam}`

    console.log('Submitting Midjourney imagine via Apiframe...')
    const result = await generateMidjourneyImages(fullPrompt, apiKey, { aspectRatio: '2:3' })
    const targetImageUrl = pickApiframeImageUrl(result)

    if (!targetImageUrl) {
      console.error('Apiframe output:', result)
      throw new Error('No image URL found in Apiframe output')
    }

    console.log('Generation successful:', targetImageUrl)

    const imgResponse = await fetch(targetImageUrl)
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image from URL: ${imgResponse.status}`)
    }
    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `poster_${episodeId}_${Date.now()}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'posters')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Poster saved to ${filePath}`)

    const localPath = `posters/${filename}`

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
      jobId: result.jobId,
      episodeId: episodeId,
    }
  },
})
