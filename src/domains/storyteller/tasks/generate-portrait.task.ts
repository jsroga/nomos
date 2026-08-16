import { task } from '@trigger.dev/sdk/v3'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import fs from 'fs'
import path from 'path'
import { generateMidjourneyImages, resolveApiframeImageSelection } from '@/shared/ai/apiframe'

interface GeneratePortraitPayload {
  prompt: string
  projectId: string
  characterId: string
  apiKey: string
  styleReferenceUrls?: string[]
}

export const generatePortrait = task({
  id: 'generate-portrait',
  maxDuration: 300,
  run: async (payload: GeneratePortraitPayload) => {
    const { prompt, projectId, characterId, apiKey, styleReferenceUrls } = payload

    console.log(
      `Starting portrait generation for character ${characterId}, prompt: ${prompt.substring(0, 50)}...`
    )

    if (!apiKey) {
      throw new Error('Apiframe API key is required')
    }

    if (!projectId || !characterId) {
      throw new Error('projectId and characterId are required')
    }

    let imagePromptPart = ''
    let srefParam = ''
    if (styleReferenceUrls && styleReferenceUrls.length > 0) {
      imagePromptPart = `${styleReferenceUrls[0]} `
      srefParam = ` --sref ${styleReferenceUrls.join(' ')}`
    }

    const fullPrompt = `${imagePromptPart}portrait of ${prompt}, professional headshot, high quality, detailed --ar 1:1${srefParam}`

    console.log('Submitting Midjourney imagine via Apiframe...')
    const result = await generateMidjourneyImages(fullPrompt, apiKey, { aspectRatio: '1:1' })
    const { imageUrl: targetImageUrl, isVariantGrid } = resolveApiframeImageSelection(result)

    if (!targetImageUrl) {
      console.error('Apiframe output:', result)
      throw new Error('No image URL found in Apiframe output')
    }

    console.log('Generation successful:', targetImageUrl)

    const imgResponse = await fetch(targetImageUrl)
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image: ${imgResponse.status}`)
    }
    const arrayBuffer = await imgResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `portrait_${characterId}_${Date.now()}.png`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'portraits')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)
    console.log(`Portrait saved to ${filePath}`)

    const localPath = `/projects/${projectId}/portraits/${filename}`
    const supabase = createSupabaseServiceClient()

    const { error: dbError } = await supabase
      .from('characters')
      .update({
        portrait_url: localPath,
      })
      .eq('id', characterId)

    if (dbError) {
      console.error('Failed to update character in DB:', dbError)
    } else {
      console.log(`Character ${characterId} portrait_url updated to ${localPath}`)
    }

    return {
      success: true,
      imageUrl: localPath,
      isVariantGrid,
      jobId: result.jobId,
      characterId: characterId,
    }
  },
})
