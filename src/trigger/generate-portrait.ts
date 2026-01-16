import { task } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { submitImagineTask, pollLegNextTask } from '../infrastructure/ai/legnext'

interface GeneratePortraitPayload {
  prompt: string
  projectId: string
  characterId: string
  apiKey: string
  styleReferenceUrls?: string[]
}

export const generatePortrait = task({
  id: 'generate-portrait',
  maxDuration: 300, // 5 mins
  run: async (payload: GeneratePortraitPayload) => {
    const { prompt, projectId, characterId, apiKey, styleReferenceUrls } = payload

    console.log(
      `Starting portrait generation for character ${characterId}, prompt: ${prompt.substring(0, 50)}...`
    )

    if (!apiKey) {
      throw new Error('LegNext API key is required')
    }

    if (!projectId || !characterId) {
      throw new Error('projectId and characterId are required')
    }

    // Build --sref parameter from URLs if present
    let srefParam = ''
    if (styleReferenceUrls && styleReferenceUrls.length > 0) {
      srefParam = `--sref ${styleReferenceUrls.join(' ')}`
    }

    const fullPrompt = `portrait of ${prompt}, professional headshot, high quality, detailed --ar 1:1 ${srefParam}`

    // 1. Submit Imagine Task to LegNext API
    console.log('Submitting imagine task to LegNext API...')
    const jobId = await submitImagineTask(fullPrompt, apiKey)

    console.log(`Task submitted to LegNext. Job ID: ${jobId}`)

    // 2. Poll for Completion using helper
    console.log('Polling for completion...')
    const output = await pollLegNextTask(jobId, apiKey)

    // Output from pollLegNextTask contains image_url or image_urls
    const targetImageUrl =
      output.image_url ||
      (output.image_urls && output.image_urls.length > 0 ? output.image_urls[0] : null)

    if (!targetImageUrl) {
      console.error('LegNext output:', output)
      throw new Error('No image URL found in LegNext output')
    }

    console.log('Generation successful:', targetImageUrl)

    // 3. Download image from LegNext URL
    const imgResponse = await fetch(targetImageUrl)
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image: ${imgResponse.status}`)
    }
    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 4. Save the image to disk
    const filename = `portrait_${characterId}_${Date.now()}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'portraits')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Portrait saved to ${filePath}`)

    // 5. Update character in database
    const localPath = `/projects/${projectId}/portraits/${filename}`
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: dbError } = await supabase
      .from('characters')
      .update({
        portrait_url: localPath,
      })
      .eq('id', characterId)

    if (dbError) {
      console.error('Failed to update character in DB:', dbError)
      // Don't throw - the image was saved successfully
    } else {
      console.log(`Character ${characterId} portrait_url updated to ${localPath}`)
    }

    return {
      success: true,
      imageUrl: localPath,
      jobId: jobId,
      characterId: characterId,
    }
  },
})
