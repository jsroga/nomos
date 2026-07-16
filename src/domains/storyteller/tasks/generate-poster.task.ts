import { task } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { submitImagineTask, pollLegNextTask } from '@/shared/ai/legnext'

interface GeneratePosterPayload {
  prompt: string
  projectId: string
  episodeId: string
  apiKey: string
  styleReferenceUrls?: string[]
}

export const generatePoster = task({
  id: 'generate-poster',
  maxDuration: 600, // 10 mins
  run: async (payload: GeneratePosterPayload) => {
    const { prompt, projectId, episodeId, apiKey, styleReferenceUrls } = payload

    console.log(
      `Starting poster generation for episode ${episodeId}, prompt: ${prompt.substring(0, 50)}...`
    )

    if (!apiKey) {
      throw new Error('LegNext API key is required')
    }

    if (!projectId || !episodeId) {
      throw new Error('projectId and episodeId are required')
    }

    // Build image prompt (first URL) + --sref (all URLs)
    let imagePromptPart = ''
    let srefParam = ''
    if (styleReferenceUrls && styleReferenceUrls.length > 0) {
      imagePromptPart = `${styleReferenceUrls[0]} `
      srefParam = ` --sref ${styleReferenceUrls.join(' ')}`
    }

    // Cinematic poster prompt construction
    const fullPrompt = `${imagePromptPart}movie poster for ${prompt}, cinematic lighting, high resolution, detailed, textless --ar 2:3${srefParam}`

    // 1. Submit Imagine Task to LegNext API
    console.log('Submitting imagine task to LegNext API...')
    // submitImagineTask returns jobId
    const jobId = await submitImagineTask(fullPrompt, apiKey)

    console.log(`Task submitted to LegNext. Job ID: ${jobId}`)

    // 2. Poll for Completion using helper
    console.log('Polling for completion...')
    const output = await pollLegNextTask(jobId, apiKey)

    // Output from pollLegNextTask is the 'output' object from LegNext response
    // which contains image_url or image_urls
    // Typically output.image_url is the grid, or maybe we need to upscale?
    // LegNext diffusion endpoint usually returns a qualitative image or grid.
    // Assuming we take the first available image URL.

    const targetImageUrl =
      output.image_url ||
      (output.image_urls && output.image_urls.length > 0 ? output.image_urls[0] : null)

    if (!targetImageUrl) {
      // Check if we need to upscale? Usually imagine returns 4 images.
      // If the user wants a poster, we probably want one of them.
      // For automation without selection, we might take the first one (U1).
      // But for now let's just grab the provided URL.
      console.error('LegNext output:', output)
      throw new Error('No image URL found in LegNext output')
    }

    console.log('Generation successful:', targetImageUrl)

    // 3. Download image
    const imgResponse = await fetch(targetImageUrl)
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image from URL: ${imgResponse.status}`)
    }
    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 4. Save to disk
    const filename = `poster_${episodeId}_${Date.now()}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'posters')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Poster saved to ${filePath}`)

    // 5. Update episode in database
    // Use relative path for frontend access
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
      // Don't throw - the image was saved successfully
    } else {
      console.log(`Episode ${episodeId} poster_url updated to ${localPath}`)
    }

    return {
      success: true,
      imageUrl: localPath,
      jobId: jobId,
      episodeId: episodeId,
    }
  },
})
